"""
summary.py — Summary metrics route.
GET /api/summary  →  Aggregate stats over all stored events.

Returns:
  { total_events, attack_count, benign_count, attack_ratio,
    top_attack_types: [{attack_type, count}],
    active_alerts: int, system_risk: float (0–100) }
"""

from collections import Counter, defaultdict
from datetime import datetime

from fastapi import APIRouter

from services.data_store import data_store

router = APIRouter(tags=["summary"])


@router.get("/summary")
async def get_summary():
    events = data_store.events
    total  = len(events)

    attack_type_counter = Counter(
        e.get("attack_type", "UNKNOWN") for e in events
    )
    benign_count  = attack_type_counter.pop("BENIGN", 0)
    attack_count  = total - benign_count
    attack_ratio  = round(attack_count / total, 4) if total else 0.0

    top_attack_types = [
        {"attack_type": k, "count": v}
        for k, v in attack_type_counter.most_common(5)
    ]

    # system_risk: average of all per-IP risk scores, scaled 0–100
    risk_entries = data_store.risk_scores
    if risk_entries:
        all_scores = [
            v["score"] if isinstance(v, dict) else float(v)
            for v in risk_entries.values()
        ]
        system_risk = round(sum(all_scores) / len(all_scores), 1)
    else:
        system_risk = 0.0

    return {
        "total_events":      total,
        "attack_count":      attack_count,
        "benign_count":      benign_count,
        "attack_ratio":      attack_ratio,
        "top_attack_types":  top_attack_types,
        "active_alerts":     len(data_store.alerts),
        "system_risk":       system_risk,
    }


@router.get("/insights")
async def get_insights():
    events = data_store.events
    
    attack_type_counter = Counter(
        e.get("attack_type", "UNKNOWN") for e in events if e.get("attack_type", "BENIGN") != "BENIGN"
    )
    attack_distribution = [
        {"attack_type": k, "count": v}
        for k, v in attack_type_counter.items()
    ]
    
    src_ip_counter = Counter(
        e.get("src_ip") for e in events if e.get("src_ip") and e.get("attack_type", "BENIGN") != "BENIGN"
    )
    top_src_ips = [
        {"src_ip": k, "count": v} 
        for k, v in src_ip_counter.most_common(10)
    ]
    
    dst_ip_counter = Counter(
        e.get("dst_ip") for e in events if e.get("dst_ip") and e.get("attack_type", "BENIGN") != "BENIGN"
    )
    top_dst_ips = [
        {"dst_ip": k, "count": v} 
        for k, v in dst_ip_counter.most_common(10)
    ]
    
    trends_map = defaultdict(lambda: {"attack_count": 0, "benign_count": 0})
    for e in events:
        ts_str = e.get("timestamp")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            date_key = ts.strftime("%Y-%m-%d %H:00")
        except:
            date_key = "Unknown"
            
        if e.get("attack_type", "BENIGN") == "BENIGN":
            trends_map[date_key]["benign_count"] += 1
        else:
            trends_map[date_key]["attack_count"] += 1
            
    trends_list = [
        {"date": k, "attack_count": v["attack_count"], "benign_count": v["benign_count"]}
        for k, v in sorted(trends_map.items())
    ]

    return {
        "attack_distribution": attack_distribution,
        "top_src_ips": top_src_ips,
        "top_dst_ips": top_dst_ips,
        "trends": trends_list
    }

