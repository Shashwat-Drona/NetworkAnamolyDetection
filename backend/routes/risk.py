"""
risk.py — IP risk score routes.
GET /api/risk  →  List of { src_ip, score (0–100), event_count, top_attack_type }
Derived from DataStore.risk_scores (populated by risk_engine).
"""

from fastapi import APIRouter
from services.data_store import data_store

router = APIRouter(tags=["risk"])


@router.get("/risk")
async def get_risk_scores():
    """
    Returns a list of risk records for each source IP seen in attack events.
    Shape: [{ src_ip, score, event_count, top_attack_type }]
    """
    result = []
    for ip, data in data_store.risk_scores.items():
        if isinstance(data, dict):
            result.append({
                "src_ip":          ip,
                "score":           data.get("score", 0.0),
                "event_count":     data.get("event_count", 0),
                "top_attack_type": data.get("top_attack_type", "UNKNOWN"),
            })
        else:
            # Legacy scalar score (backward compat)
            result.append({
                "src_ip":          ip,
                "score":           float(data),
                "event_count":     0,
                "top_attack_type": "UNKNOWN",
            })
    # Sort descending by score
    result.sort(key=lambda x: x["score"], reverse=True)
    return result
