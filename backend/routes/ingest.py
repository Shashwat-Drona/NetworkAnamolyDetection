"""
ingest.py — ML integration seam.
POST /api/ingest  →  Accept a single fully-formed event and append to DataStore.

Validates all schema fields are present. No ML logic.
Returns: { status: "ok", id: str }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from services.data_store import data_store
from services.alert_engine import process_event
from services.risk_engine import update_risk

router = APIRouter(tags=["ingest"])

VALID_SEVERITIES = {"Low", "Medium", "High", "Critical"}


class EventPayload(BaseModel):
    id:             str
    timestamp:      str
    src_ip:         str
    dst_ip:         str
    protocol:       str
    packets_per_sec: float
    bytes:          int
    flow_duration:  float
    attack_type:    str
    confidence:     float
    severity:       str

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITIES:
            raise ValueError(f"severity must be one of {VALID_SEVERITIES}")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0.0 and 1.0")
        return v


@router.post("/ingest")
async def ingest_event(payload: EventPayload):
    event = payload.model_dump()
    data_store.add_event(event)
    process_event(event, data_store)
    update_risk(event, data_store)
    return {"status": "ok", "id": payload.id}
