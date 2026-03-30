import os
import joblib
import numpy as np
import shap

try:
    import onnxruntime as ort
    has_onnx = True
except ImportError:
    has_onnx = False

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

class MLEngine:
    def __init__(self):
        self.rf_model = None
        self.rf_onnx_session = None
        self.iso_model = None
        self.scaler = None
        self.label_encoder = None
        self.selected_features = []
        self.explainer = None
        
        self.iso_min = -0.2
        self.iso_max = 0.2
        self.flow_mu = 0.0
        self.flow_sigma = 1.0
        
        self.load_artifacts()

    def load_artifacts(self):
        with open(os.path.join(MODEL_DIR, "selected_features.txt"), "r") as f:
            self.selected_features = [line.strip() for line in f if line.strip()]
            
        self.scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        self.label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        
        self.rf_model = joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl"))
        self.iso_model = joblib.load(os.path.join(MODEL_DIR, "iso_model.pkl"))
        
        if has_onnx and os.path.exists(os.path.join(MODEL_DIR, "rf_model.onnx")):
            self.rf_onnx_session = ort.InferenceSession(
                os.path.join(MODEL_DIR, "rf_model.onnx"), 
                providers=["CPUExecutionProvider"]
            )
            
        self.explainer = shap.TreeExplainer(self.rf_model)
        
        try:
            flow_idx = self.selected_features.index("flow_packets/s")
            self.flow_mu = self.scaler.mean_[flow_idx]
            self.flow_sigma = self.scaler.scale_[flow_idx] + 1e-8
        except ValueError:
            self.flow_mu = 10.0
            self.flow_sigma = 100.0

    def format_features(self, payload_dict):
        vec = np.zeros((1, len(self.selected_features)), dtype=np.float32)
        for i, f in enumerate(self.selected_features):
            vec[0, i] = float(payload_dict.get(f, 0.0))
        return vec

    def predict(self, feature_dict):
        x_raw = self.format_features(feature_dict)
        x_scaled = self.scaler.transform(x_raw).astype(np.float32)
        
        proba = self.rf_model.predict_proba(x_scaled)
        pred_enc = np.argmax(proba, axis=1)[0]
        attack_type = self.label_encoder.inverse_transform([pred_enc])[0]
        
        benign_index = np.where(self.label_encoder.classes_ == "Benign")[0]
        if len(benign_index) > 0:
            rf_attack_prob = 1.0 - proba[0, int(benign_index[0])]
        else:
            rf_attack_prob = float(proba[0, pred_enc])
            
        iso_raw = -self.iso_model.decision_function(x_scaled)[0]
        iso_norm = (iso_raw - self.iso_min) / (self.iso_max - self.iso_min + 1e-8)
        iso_norm = np.clip(iso_norm, 0.0, 1.0)
        
        flow_packets = float(feature_dict.get("flow_packets/s", 0.0))
        z = abs((flow_packets - self.flow_mu) / self.flow_sigma)
        z_norm = np.clip(z / 3.0, 0.0, 1.0)
        
        risk_score = min(max(0.5 * rf_attack_prob + 0.3 * iso_norm + 0.2 * z_norm, 0.0), 1.0) * 100.0
        
        shap_values = self.explainer.shap_values(x_scaled)
        if isinstance(shap_values, list):
            sv = shap_values[pred_enc][0]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            sv = shap_values[0, :, pred_enc]
        else:
            sv = shap_values[0]
            
        top_idx = np.argsort(np.abs(sv))[-3:][::-1]
        
        feature_hint_map = {
            ("syn_flag_count", "high"): "Possible SYN flood behavior due to elevated SYN flags.",
            ("bwd_packets/s", "low"): "Possible one-way flood pattern with weak backward response.",
            ("flow_packets/s", "high"): "Very high packet rate suggests volumetric attack activity.",
            ("packet_length_variance", "high"): "High packet-size variance can indicate mixed malicious payload patterns.",
            ("idle_mean", "low"): "Low idle time suggests sustained aggressive traffic bursts.",
            ("active_mean", "high"): "High active window indicates persistent high activity flow behavior."
        }
        
        top_triplets = []
        for j in top_idx:
            feat = self.selected_features[int(j)]
            direction = "high" if x_scaled[0, int(j)] >= 0 else "low"
            sv_val = float(sv[int(j)])
            desc = feature_hint_map.get((feat, direction), f"{direction.capitalize()} {feat} influenced this prediction.")
            top_triplets.append([feat, direction, sv_val, desc])
            
        plain_english = " ".join([t[3] for t in top_triplets])
        top_3 = [[t[0], t[1], round(t[2], 4)] for t in top_triplets]
        
        return {
            "attack_type": attack_type,
            "risk_score": float(risk_score),
            "confidence": float(proba[0, pred_enc]),
            "top_3_shap_features": top_3,
            "plain_english_explanation": plain_english
        }

ml_engine = MLEngine()
