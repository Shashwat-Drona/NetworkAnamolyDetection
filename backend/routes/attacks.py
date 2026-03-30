"""
attacks.py — Paginated, filtered attack event list.
GET /api/attacks?page=1&limit=50&attack_type=&protocol=&src_ip=&dst_ip=

Response: { data: [events], total, page, limit }
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from services.data_store import data_store

router = APIRouter(tags=["attacks"])


@router.get("/attacks")
async def list_attacks(
    page:        int            = Query(1,  ge=1),
    limit:       int            = Query(50, ge=1, le=500),
    attack_type: Optional[str]  = Query(None),
    protocol:    Optional[str]  = Query(None),
    src_ip:      Optional[str]  = Query(None),
    dst_ip:      Optional[str]  = Query(None),
):
    """Return paginated, server-side-filtered list of all events."""
    results = data_store.events

    if attack_type:
        results = [e for e in results if e.get("attack_type") == attack_type]
    if protocol:
        results = [e for e in results if e.get("protocol") == protocol]
    if src_ip:
        results = [e for e in results if e.get("src_ip") == src_ip]
    if dst_ip:
        results = [e for e in results if e.get("dst_ip") == dst_ip]

    total  = len(results)
    start  = (page - 1) * limit
    end    = start + limit
    paged  = results[start:end]

    return {
        "data":  paged,
        "total": total,
        "page":  page,
        "limit": limit,
    }


@router.get("/attacks/{event_id}")
async def get_attack(event_id: str):
    """Fetch a single event by its id field."""
    for e in data_store.events:
        if str(e.get("id")) == event_id:
            return e
    raise HTTPException(status_code=404, detail="Event not found")


@router.get("/timeline")
async def get_timeline(limit: int = Query(500, ge=1, le=10000)):
    """Fetch the last N events sorted by timestamp for timeline playback."""
    events = data_store.events[-limit:]
    
    try:
        from datetime import datetime
        def parse_ts(e):
            ts_str = e.get("timestamp")
            if not ts_str:
                return datetime.min
            try:
                return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            except:
                return datetime.min
                
        return sorted(events, key=parse_ts)
    except:
        return sorted(events, key=lambda x: str(x.get("timestamp", "")))

