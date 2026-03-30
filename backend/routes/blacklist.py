"""
blacklist.py — IP blacklist management routes.
GET    /api/blacklist       →  { blacklisted: [src_ip] }
POST   /api/blacklist       →  { status: "ok", src_ip: str }
DELETE /api/blacklist/{ip}  →  { status: "ok", src_ip: str }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.data_store import data_store

router = APIRouter(tags=["blacklist"])


class BlacklistRequest(BaseModel):
    src_ip: str


@router.get("/blacklist")
async def get_blacklist():
    """Return all blacklisted source IPs."""
    return {"blacklisted": list(data_store.blacklist)}


@router.post("/blacklist")
async def add_to_blacklist(body: BlacklistRequest):
    """Add a source IP to the blacklist."""
    data_store.add_to_blacklist(body.src_ip)
    return {"status": "ok", "src_ip": body.src_ip}


@router.delete("/blacklist/{src_ip:path}")
async def remove_from_blacklist(src_ip: str):
    """Remove a source IP from the blacklist."""
    if src_ip not in data_store.blacklist:
        raise HTTPException(status_code=404, detail=f"IP '{src_ip}' not in blacklist")
    data_store.remove_from_blacklist(src_ip)
    return {"status": "ok", "src_ip": src_ip}
