"""
Lightweight prediction API for CICIDS intrusion detection.
Returns attack type, risk score, confidence, SHAP top-3 features, and plain-English explanation.
"""

from pathlib import Path
import numpy as np
import joblib
import onnxruntime as ort
import shap

# Lazy-loaded global artifacts
_SCALER = None
_LABEL_ENCODER = None
_ISO_MODEL = None
_RF_MODEL = None
_ONNX_SESSION = None
_SELECTED_FEATURES = None
_INPUT_NAME = None
_EXPLAINER = None

# Cached stats for risk scoring
_ISO_MIN = None
_ISO_MAX = None
_FLOW_MU = 0.0
_FLOW_SIGMA = 1.0

_FEATURE_HINT_MAP = {
    ("syn_flag_count", "high"): "Possible SYN flood behavior due to elevated SYN flags.",
    ("bwd_packets/s", "low"): "Possible one-way flood pattern with weak backward response.",
    ("flow_packets/s", "high"): "Very high packet rate suggests volumetric attack activity.",
    ("packet_length_variance", "high"): "High packet-size variance can indicate mixed malicious payload patterns.",
    ("idle_mean", "low"): "Low idle time suggests sustained aggressive traffic bursts.",
    ("active_mean", "high"): "High active window indicates persistent high activity flow behavior."
}


def _load_selected_features(path="selected_features.txt"):
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Missing feature list: {p.resolve()}")
    return [line.strip() for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]


def _ensure_loaded():
    global _SCALER, _LABEL_ENCODER, _ISO_MODEL, _RF_MODEL, _ONNX_SESSION
    global _SELECTED_FEATURES, _INPUT_NAME, _EXPLAINER, _ISO_MIN, _ISO_MAX

    if _SCALER is None:
        _SCALER = joblib.load("scaler.pkl")
    if _LABEL_ENCODER is None:
        _LABEL_ENCODER = joblib.load("label_encoder.pkl")
    if _ISO_MODEL is None:
        _ISO_MODEL = joblib.load("iso_model.pkl")
    if _RF_MODEL is None:
        _RF_MODEL = joblib.load("rf_model.pkl")
    if _SELECTED_FEATURES is None:
        _SELECTED_FEATURES = _load_selected_features("selected_features.txt")
    if _ONNX_SESSION is None:
        _ONNX_SESSION = ort.InferenceSession("rf_model.onnx", providers=["CPUExecutionProvider"])
        _INPUT_NAME = _ONNX_SESSION.get_inputs()[0].name
    if _EXPLAINER is None:
        _EXPLAINER = shap.TreeExplainer(_RF_MODEL)

    # Build normalization range once using scaler statistics around zero-centered synthetic point.
    if _ISO_MIN is None or _ISO_MAX is None:
        ref = np.zeros((256, len(_SELECTED_FEATURES)), dtype=np.float32)
        ref += np.random.normal(0.0, 1.0, size=ref.shape).astype(np.float32)
        iso_vals = -_ISO_MODEL.decision_function(ref)
        _ISO_MIN = float(np.min(iso_vals))
        _ISO_MAX = float(np.max(iso_vals))


def _to_shap_vector(shap_values_obj, pred_class_index):
    if isinstance(shap_values_obj, list):
        return np.asarray(shap_values_obj[pred_class_index][0])
    if isinstance(shap_values_obj, np.ndarray) and shap_values_obj.ndim == 3:
        return np.asarray(shap_values_obj[0, :, pred_class_index])
    if isinstance(shap_values_obj, np.ndarray) and shap_values_obj.ndim == 2:
        return np.asarray(shap_values_obj[0])
    raise ValueError("Unsupported SHAP output format.")


def _explain(top_features):
    fragments = []
    for feat, direction, _ in top_features:
        fragments.append(_FEATURE_HINT_MAP.get((feat, direction), f"{direction.capitalize()} {feat} influenced this decision."))
    return " ".join(fragments)


def predict(flow_features_dict):
    """
    Parameters
    ----------
    flow_features_dict : dict
        Dictionary containing CICIDS feature names and numeric values.

    Returns
    -------
    dict
        {
          "attack_type": str,
          "risk_score": float,
          "confidence": float,
          "top_3_shap_features": list,
          "plain_english_explanation": str
        }
    """
    _ensure_loaded()

    row = []
    for feat in _SELECTED_FEATURES:
        val = flow_features_dict.get(feat, 0.0)
        try:
            row.append(float(val))
        except Exception:
            row.append(0.0)

    x = np.array([row], dtype=np.float32)
    x_scaled = _SCALER.transform(x).astype(np.float32)

    onnx_out = _ONNX_SESSION.run(None, {_INPUT_NAME: x_scaled})
    pred_enc = int(np.asarray(onnx_out[0])[0])
    pred_label = _LABEL_ENCODER.inverse_transform([pred_enc])[0]

    # Probability output can be a list of dicts depending on ONNX conversion options.
    proba_raw = onnx_out[1]
    if isinstance(proba_raw, list) and len(proba_raw) > 0 and isinstance(proba_raw[0], dict):
        proba_vec = np.zeros(len(_LABEL_ENCODER.classes_), dtype=np.float32)
        for k, v in proba_raw[0].items():
            proba_vec[int(k)] = float(v)
    else:
        proba_vec = np.asarray(proba_raw)[0].astype(np.float32)

    benign_candidates = np.where(_LABEL_ENCODER.classes_ == "Benign")[0]
    benign_idx = int(benign_candidates[0]) if len(benign_candidates) else 0

    rf_attack_prob = 1.0 - float(proba_vec[benign_idx])

    iso_raw = float(-_ISO_MODEL.decision_function(x_scaled)[0])
    iso_norm = (iso_raw - _ISO_MIN) / (_ISO_MAX - _ISO_MIN + 1e-8)
    iso_norm = float(np.clip(iso_norm, 0.0, 1.0))

    flow_packets_val = float(flow_features_dict.get("flow_packets/s", 0.0))
    z = abs((flow_packets_val - _FLOW_MU) / (_FLOW_SIGMA + 1e-8))
    z_norm = float(np.clip(z / 3.0, 0.0, 1.0))

    risk_score = float(np.clip((0.5 * rf_attack_prob + 0.3 * iso_norm + 0.2 * z_norm) * 100.0, 0.0, 100.0))

    shap_values = _EXPLAINER.shap_values(x_scaled)
    sv = _to_shap_vector(shap_values, pred_enc)
    top_idx = np.argsort(np.abs(sv))[-3:][::-1]

    top_3 = []
    for i in top_idx:
        feat = _SELECTED_FEATURES[int(i)]
        direction = "high" if float(x_scaled[0, int(i)]) >= 0 else "low"
        top_3.append((feat, direction, float(sv[int(i)])))

    return {
        "attack_type": str(pred_label),
        "risk_score": round(risk_score, 2),
        "confidence": round(float(np.max(proba_vec)), 4),
        "top_3_shap_features": [(f, d, round(v, 4)) for f, d, v in top_3],
        "plain_english_explanation": _explain(top_3)
    }

_FLOW_MU = 0.09045627206773068
_FLOW_SIGMA = 1.0435199290680256
