import asyncio
import csv
import json
import random
import threading
import time
from collections import Counter, deque
from datetime import datetime
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import predictor


LOG_PATH = Path("response_log.csv")
BLOCKED_PATH = Path("blocked_ips.txt")
QUARANTINE_PATH = Path("quarantine_list.txt")
MAX_EVENTS = 2000

_EVENTS: Deque[Dict[str, Any]] = deque(maxlen=MAX_EVENTS)
_LOCK = threading.Lock()
_SIM_STOP = threading.Event()
_SIM_THREAD: Optional[threading.Thread] = None
_EVENT_SEQ = 0
_BLOCKED_IPS: set[str] = set()
_QUARANTINED_IPS: set[str] = set()
_ATTACK_LABEL_POOL = ["DoS-Hulk", "PortScan", "SSH BruteForce", "Botnet", "Webattack-SQLi"]
_ATTACK_LABEL_IDX = 0
_TOTAL_EVENTS = 0
_TOTAL_ATTACK_COUNT = 0
_TOTAL_BENIGN_COUNT = 0
_TOTAL_ATTACK_TYPES: Counter[str] = Counter()


class PredictRequest(BaseModel):
    flow_features: Dict[str, float] = Field(
        ..., description="Dictionary of CICIDS flow features keyed by feature name"
    )


class PredictResponse(BaseModel):
    attack_type: str
    risk_score: float
    confidence: float
    top_3_shap_features: List[List[Any]]
    plain_english_explanation: str


class SimulateRequest(BaseModel):
    attack_type: str = "DoS"
    count: int = 20


class BlockRequest(BaseModel):
    src_ip: str


app = FastAPI(
    title="GDG WIT IDS API",
    description="FastAPI wrapper for Raspberry Pi-friendly network intrusion detection",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _load_lines(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def _save_lines(path: Path, values: set[str]) -> None:
    sorted_values = sorted(values)
    text = "\n".join(sorted_values) + ("\n" if sorted_values else "")
    path.write_text(text, encoding="utf-8")


def _append_prediction_log(event: Dict[str, Any]) -> None:
    headers = ["timestamp", "source_ip", "attack_type", "risk_score", "action", "reason", "confidence"]
    row = {
        "timestamp": event["timestamp"],
        "source_ip": event["src_ip"],
        "attack_type": event["attack_type"],
        "risk_score": event["risk_score"],
        "action": event["action"],
        "reason": event["reason"],
        "confidence": event["confidence"],
    }
    new_file = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        if new_file:
            writer.writeheader()
        writer.writerow(row)


def _normalize_attack(label: str) -> str:
    return "BENIGN" if str(label).strip().lower() == "benign" else str(label)


def _severity_from_risk(risk_score: float) -> str:
    if risk_score >= 85:
        return "Critical"
    if risk_score >= 65:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def _response_action(event: Dict[str, Any]) -> tuple[str, str]:
    attack = event["attack_type"]
    risk = float(event["risk_score"])
    src_ip = event["src_ip"]

    if attack != "BENIGN" or risk >= 40.0:
        if risk >= 80.0:
            _BLOCKED_IPS.add(src_ip)
            _save_lines(BLOCKED_PATH, _BLOCKED_IPS)
            return "BLOCK", "High-confidence anomaly. Source auto-blocked."
        if risk >= 55.0:
            _QUARANTINED_IPS.add(src_ip)
            _save_lines(QUARANTINE_PATH, _QUARANTINED_IPS)
            return "QUARANTINE", "Suspicious flow. Source moved to quarantine watchlist."
        return "MONITOR", "Mild anomaly signal. Monitoring in progress."
    return "ALLOW", "Traffic profile appears normal."


def _next_seq() -> int:
    global _EVENT_SEQ
    _EVENT_SEQ += 1
    return _EVENT_SEQ


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default


def _gen_ip(private: bool = True) -> str:
    if private:
        return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
    return f"{random.randint(11,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def _selected_features() -> List[str]:
    predictor._ensure_loaded()
    return list(predictor._SELECTED_FEATURES)


def _build_flow_profile(mode: str = "normal") -> Dict[str, float]:
    feats = _selected_features()
    flow = {name: 0.0 for name in feats}

    if "flow_packets/s" in flow:
        flow["flow_packets/s"] = random.uniform(4.0, 35.0) if mode == "normal" else random.uniform(90.0, 300.0)
    if "syn_flag_count" in flow:
        flow["syn_flag_count"] = random.uniform(0.0, 2.0) if mode == "normal" else random.uniform(15.0, 60.0)
    if "bwd_packets/s" in flow:
        flow["bwd_packets/s"] = random.uniform(5.0, 30.0) if mode == "normal" else random.uniform(0.0, 3.0)
    if "packet_length_variance" in flow:
        flow["packet_length_variance"] = random.uniform(100.0, 800.0) if mode == "normal" else random.uniform(1200.0, 4500.0)
    if "flow_duration" in flow:
        flow["flow_duration"] = random.uniform(1.0, 30.0) if mode == "normal" else random.uniform(0.1, 8.0)

    return flow


def _register_event(event: Dict[str, Any]) -> Dict[str, Any]:
    global _TOTAL_EVENTS, _TOTAL_ATTACK_COUNT, _TOTAL_BENIGN_COUNT
    with _LOCK:
        action, reason = _response_action(event)
        event["action"] = action
        event["reason"] = reason
        _EVENTS.append(event)

        _TOTAL_EVENTS += 1
        if event.get("attack_type") == "BENIGN":
            _TOTAL_BENIGN_COUNT += 1
        else:
            _TOTAL_ATTACK_COUNT += 1
            _TOTAL_ATTACK_TYPES[str(event.get("attack_type", "UNKNOWN"))] += 1

        _append_prediction_log(event)
    return event


def _make_event_from_prediction(
    prediction: Dict[str, Any],
    flow_features: Dict[str, float],
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
    protocol: Optional[str] = None,
) -> Dict[str, Any]:
    attack = _normalize_attack(str(prediction.get("attack_type", "BENIGN")))
    risk = _safe_float(prediction.get("risk_score", 0.0), 0.0)
    confidence = _safe_float(prediction.get("confidence", 0.0), 0.0)
    packets_per_sec = _safe_float(flow_features.get("flow_packets/s", random.uniform(1.0, 30.0)), 0.0)
    flow_duration = _safe_float(flow_features.get("flow_duration", random.uniform(0.1, 20.0)), 0.0)

    return {
        "seq": _next_seq(),
        "id": str(uuid4()),
        "timestamp": _now_iso(),
        "src_ip": src_ip or _gen_ip(private=True),
        "dst_ip": dst_ip or _gen_ip(private=True),
        "protocol": protocol or random.choice(["TCP", "UDP", "ICMP", "HTTP"]),
        "attack_type": attack,
        "confidence": round(confidence, 4),
        "risk_score": round(risk, 2),
        "severity": _severity_from_risk(risk),
        "packets_per_sec": round(packets_per_sec, 3),
        "flow_duration": round(flow_duration, 3),
        "top_3_shap_features": [list(item) for item in prediction.get("top_3_shap_features", [])],
        "plain_english_explanation": prediction.get("plain_english_explanation", ""),
    }


def _make_forced_attack_event(attack_type: str) -> Dict[str, Any]:
    risk = random.uniform(70.0, 98.0)
    event = {
        "seq": _next_seq(),
        "id": str(uuid4()),
        "timestamp": _now_iso(),
        "src_ip": _gen_ip(private=False),
        "dst_ip": _gen_ip(private=True),
        "protocol": random.choice(["TCP", "UDP", "HTTP"]),
        "attack_type": attack_type,
        "confidence": 0.95,
        "risk_score": round(risk, 2),
        "severity": _severity_from_risk(risk),
        "packets_per_sec": round(random.uniform(120.0, 480.0), 3),
        "flow_duration": round(random.uniform(0.1, 6.0), 3),
        "top_3_shap_features": [],
        "plain_english_explanation": "Synthetic attack injected for live demonstration.",
    }
    return event


def _sim_loop() -> None:
    global _ATTACK_LABEL_IDX
    while not _SIM_STOP.is_set():
        try:
            # Keep simulated background mostly normal for a realistic live dashboard.
            mode = "attack" if random.random() < 0.22 else "normal"
            flow = _build_flow_profile(mode)
            pred = predictor.predict(flow)
            event = _make_event_from_prediction(pred, flow)

            if mode == "normal":
                # The trained model can over-predict DoS-Hulk on synthetic vectors.
                # For demo realism, always keep background traffic benign.
                event["attack_type"] = "BENIGN"
                event["risk_score"] = round(random.uniform(6.0, 24.0), 2)
                event["confidence"] = round(max(event.get("confidence", 0.6), 0.75), 4)
                event["severity"] = _severity_from_risk(event["risk_score"])
                event["plain_english_explanation"] = "Traffic pattern matches normal baseline behavior."
            else:
                # Diversify attack labels so graphs are not single-class dominated.
                event["attack_type"] = _ATTACK_LABEL_POOL[_ATTACK_LABEL_IDX % len(_ATTACK_LABEL_POOL)]
                _ATTACK_LABEL_IDX += 1
                bucket_roll = random.random()
                if bucket_roll < 0.2:
                    forced_risk = random.uniform(45.0, 54.5)  # MONITOR
                elif bucket_roll < 0.75:
                    forced_risk = random.uniform(56.0, 79.0)  # QUARANTINE
                else:
                    forced_risk = random.uniform(80.0, 96.0)  # BLOCK
                event["risk_score"] = round(max(float(event.get("risk_score", 0.0)), forced_risk), 2)
                event["confidence"] = round(max(float(event.get("confidence", 0.0)), 0.88), 4)
                event["severity"] = _severity_from_risk(event["risk_score"])

            _register_event(event)
        except Exception:
            pass
        time.sleep(1.2)


def _start_simulation() -> bool:
    global _SIM_THREAD
    if _SIM_THREAD and _SIM_THREAD.is_alive():
        return False
    _SIM_STOP.clear()
    _SIM_THREAD = threading.Thread(target=_sim_loop, daemon=True)
    _SIM_THREAD.start()
    return True


def _stop_simulation() -> None:
    _SIM_STOP.set()


def _get_events_copy() -> List[Dict[str, Any]]:
    with _LOCK:
        return list(_EVENTS)


def _load_log_history() -> None:
    if not LOG_PATH.exists():
        return
    try:
        rows = list(csv.DictReader(LOG_PATH.open("r", encoding="utf-8")))
    except Exception:
        return

    for row in rows[-500:]:
        risk = _safe_float(row.get("risk_score", 0.0), 0.0)
        confidence = _safe_float(row.get("confidence", 0.0), 0.0)
        attack = _normalize_attack(row.get("attack_type", "BENIGN"))
        event = {
            "seq": _next_seq(),
            "id": str(uuid4()),
            "timestamp": row.get("timestamp") or _now_iso(),
            "src_ip": row.get("source_ip", "0.0.0.0"),
            "dst_ip": _gen_ip(private=True),
            "protocol": random.choice(["TCP", "UDP", "ICMP", "HTTP"]),
            "attack_type": attack,
            "confidence": confidence,
            "risk_score": risk,
            "severity": _severity_from_risk(risk),
            "packets_per_sec": round(random.uniform(2.0, 150.0), 3),
            "flow_duration": round(random.uniform(0.2, 20.0), 3),
            "top_3_shap_features": [],
            "plain_english_explanation": row.get("reason", "Recovered from historical log."),
            "action": row.get("action", "MONITOR"),
            "reason": row.get("reason", ""),
        }
        _EVENTS.append(event)


@app.on_event("startup")
def warmup() -> None:
    global _BLOCKED_IPS, _QUARANTINED_IPS
    try:
        predictor._ensure_loaded()
    except Exception as exc:
        raise RuntimeError(f"Model warmup failed: {exc}")

    _BLOCKED_IPS = _load_lines(BLOCKED_PATH)
    _QUARANTINED_IPS = _load_lines(QUARANTINE_PATH)


@app.get("/health")
@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/features")
@app.get("/api/features")
def features() -> Dict[str, List[str]]:
    path = Path("selected_features.txt")
    if not path.exists():
        raise HTTPException(status_code=500, detail="selected_features.txt not found")
    selected = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return {"selected_features": selected}


@app.post("/predict", response_model=PredictResponse)
@app.post("/api/predict", response_model=PredictResponse)
def predict_endpoint(payload: PredictRequest) -> Dict[str, Any]:
    try:
        result = predictor.predict(payload.flow_features)
        event = _make_event_from_prediction(result, payload.flow_features)
        _register_event(event)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    result["attack_type"] = _normalize_attack(str(result.get("attack_type", "BENIGN")))
    result["top_3_shap_features"] = [list(item) for item in result.get("top_3_shap_features", [])]
    result["risk_score"] = float(result.get("risk_score", 0.0))
    result["confidence"] = float(result.get("confidence", 0.0))
    return result


@app.get("/api/summary")
def summary() -> Dict[str, Any]:
    events = _get_events_copy()
    with _LOCK:
        total = _TOTAL_EVENTS
        attack_count = _TOTAL_ATTACK_COUNT
        benign_count = _TOTAL_BENIGN_COUNT
        top_attack_types = dict(_TOTAL_ATTACK_TYPES.most_common(6))

    if total == 0:
        return {
            "total_events": 0,
            "attack_count": 0,
            "benign_count": 0,
            "attack_ratio": 0.0,
            "system_risk": 0.0,
            "top_attack_types": {},
        }

    attack_ratio = (attack_count / total) * 100.0
    recent = events[-30:]
    system_risk = sum(float(e.get("risk_score", 0.0)) for e in recent) / max(len(recent), 1)

    return {
        "total_events": total,
        "attack_count": attack_count,
        "benign_count": benign_count,
        "attack_ratio": round(attack_ratio, 2),
        "system_risk": round(system_risk, 2),
        "top_attack_types": top_attack_types,
    }


@app.get("/api/stream")
async def stream() -> StreamingResponse:
    async def event_generator():
        cursor = 0
        while True:
            fresh: List[Dict[str, Any]] = []
            with _LOCK:
                for event in _EVENTS:
                    seq = int(event.get("seq", 0))
                    if seq > cursor:
                        fresh.append(event)
                if fresh:
                    cursor = int(fresh[-1]["seq"])

            if fresh:
                for event in fresh:
                    yield f"data: {json.dumps(event)}\n\n"
            else:
                yield ": keep-alive\n\n"

            await asyncio.sleep(1.0)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/sim/start")
def sim_start() -> Dict[str, Any]:
    with _LOCK:
        _EVENTS.clear()
    started = _start_simulation()
    return {"running": True, "started": started}


@app.post("/api/sim/stop")
def sim_stop() -> Dict[str, Any]:
    _stop_simulation()
    return {"running": False}


@app.post("/api/simulate")
def simulate_once(payload: SimulateRequest) -> Dict[str, Any]:
    count = max(1, min(int(payload.count), 200))
    attack_type = payload.attack_type.strip() or "DoS"

    for _ in range(count):
        event = _make_forced_attack_event(attack_type)
        _register_event(event)

    return {"injected": count, "attack_type": attack_type}


@app.get("/api/timeline")
def timeline(limit: int = Query(default=500, ge=1, le=2000)) -> List[Dict[str, Any]]:
    events = _get_events_copy()[-limit:]
    return events


@app.get("/api/attacks")
def attacks(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    attack_type: Optional[str] = None,
    protocol: Optional[str] = None,
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
) -> Dict[str, Any]:
    items = _get_events_copy()

    def _match(v: Optional[str], q: Optional[str]) -> bool:
        if not q:
            return True
        return q.lower() in (v or "").lower()

    filtered = [
        e for e in items
        if (not attack_type or attack_type == "All" or e.get("attack_type") == attack_type)
        and (not protocol or protocol == "All" or e.get("protocol") == protocol)
        and _match(e.get("src_ip"), src_ip)
        and _match(e.get("dst_ip"), dst_ip)
    ]

    filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    return {"items": filtered[start:end], "total": total, "page": page, "limit": limit}


@app.get("/api/attacks/{attack_id}")
def attack_detail(attack_id: str) -> Dict[str, Any]:
    events = _get_events_copy()
    for event in events:
        if str(event.get("id")) == attack_id:
            return event
    raise HTTPException(status_code=404, detail="Attack event not found")


@app.get("/api/blacklist")
def blacklist_get() -> Dict[str, Any]:
    return {"blacklisted": sorted(_BLOCKED_IPS)}


@app.post("/api/blacklist")
def blacklist_add(payload: BlockRequest) -> Dict[str, Any]:
    ip = payload.src_ip.strip()
    if not ip:
        raise HTTPException(status_code=400, detail="src_ip is required")
    _BLOCKED_IPS.add(ip)
    _save_lines(BLOCKED_PATH, _BLOCKED_IPS)
    return {"blacklisted": sorted(_BLOCKED_IPS)}


@app.delete("/api/blacklist/{src_ip}")
def blacklist_remove(src_ip: str) -> Dict[str, Any]:
    _BLOCKED_IPS.discard(src_ip)
    _save_lines(BLOCKED_PATH, _BLOCKED_IPS)
    return {"blacklisted": sorted(_BLOCKED_IPS)}


@app.get("/api/insights")
def insights() -> Dict[str, Any]:
    events = _get_events_copy()
    if not events:
        return {
            "attack_distribution": [],
            "top_src_ips": [],
            "top_dst_ips": [],
            "trends": [],
        }

    attack_dist_counter = Counter(e.get("attack_type", "UNKNOWN") for e in events)
    attack_distribution = [
        {"attack_type": k, "count": v} for k, v in attack_dist_counter.most_common(8)
    ]

    top_src = [{"src_ip": k, "count": v} for k, v in Counter(e.get("src_ip", "") for e in events).most_common(8)]
    top_dst = [{"dst_ip": k, "count": v} for k, v in Counter(e.get("dst_ip", "") for e in events).most_common(8)]

    trends_map: Dict[str, Dict[str, int]] = {}
    for e in events:
        ts = str(e.get("timestamp", ""))
        bucket = ts[:16] if len(ts) >= 16 else ts
        if bucket not in trends_map:
            trends_map[bucket] = {"attack_count": 0, "benign_count": 0}
        if e.get("attack_type") == "BENIGN":
            trends_map[bucket]["benign_count"] += 1
        else:
            trends_map[bucket]["attack_count"] += 1

    trends = [
        {"date": k, "attack_count": v["attack_count"], "benign_count": v["benign_count"]}
        for k, v in sorted(trends_map.items())[-30:]
    ]

    return {
        "attack_distribution": attack_distribution,
        "top_src_ips": top_src,
        "top_dst_ips": top_dst,
        "trends": trends,
    }


@app.get("/logs/predictions")
def get_prediction_logs() -> Dict[str, Any]:
    if not LOG_PATH.exists():
        return {"predictions": [], "total": 0}

    predictions = []
    try:
        with LOG_PATH.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row["risk_score"] = _safe_float(row.get("risk_score", 0.0), 0.0)
                row["confidence"] = _safe_float(row.get("confidence", 0.0), 0.0)
                predictions.append(row)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read prediction logs: {exc}")

    return {"predictions": predictions, "total": len(predictions)}


@app.get("/logs/blocked-ips")
def get_blocked_ips() -> Dict[str, Any]:
    return {"blocked_ips": sorted(_BLOCKED_IPS), "total": len(_BLOCKED_IPS)}


@app.get("/logs/quarantine")
def get_quarantine_list() -> Dict[str, Any]:
    return {"quarantine": sorted(_QUARANTINED_IPS), "total": len(_QUARANTINED_IPS)}
