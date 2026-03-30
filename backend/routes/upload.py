"""
upload.py — CSV dataset upload route.
POST /api/upload  →  Accept multipart CSV, parse CICIDS2018 columns, load into DataStore.

Column mapping (CICIDS2018 → schema):
  ' Source IP'                      → src_ip
  ' Destination IP'                 → dst_ip
  ' Protocol'                       → protocol
  ' Label'                          → attack_type
  ' Packets/s'                      → packets_per_sec
  ' Total Length of Fwd Packets'    → bytes
  ' Flow Duration'                  → flow_duration

Returns: { loaded: int, errors: int }
"""

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File

from services.data_store import data_store, MAX_EVENTS
from services.alert_engine import process_event
from services.risk_engine import update_risk

router = APIRouter(tags=["upload"])

# CICIDS2018 → schema field mapping
COLUMN_MAP = {
    " Source IP":                   "src_ip",
    " Destination IP":              "dst_ip",
    " Protocol":                    "protocol",
    " Label":                       "attack_type",
    " Packets/s":                   "packets_per_sec",
    " Total Length of Fwd Packets": "bytes",
    " Flow Duration":               "flow_duration",
}

SEVERITY_MAP = {
    "DoS":            "Critical",
    "PortScan":       "Medium",
    "SSH BruteForce": "High",
    "Botnet":         "High",
    "BENIGN":         "Low",
}

PROTOCOL_MAP = {
    "6":  "TCP",
    "17": "UDP",
    "1":  "ICMP",
}


def _derive_severity(attack_type: str) -> str:
    for key, sev in SEVERITY_MAP.items():
        if key.lower() in attack_type.lower():
            return sev
    return "Low" if attack_type.upper() == "BENIGN" else "Medium"


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        text = content.decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {exc}")

    reader = csv.DictReader(io.StringIO(text))

    loaded = 0
    errors = 0
    now    = datetime.now(timezone.utc).isoformat()

    for row in reader:
        try:
            mapped: dict = {}
            for csv_col, schema_field in COLUMN_MAP.items():
                raw = row.get(csv_col, "").strip()
                mapped[schema_field] = raw

            # Required field check
            if not mapped.get("src_ip") or not mapped.get("attack_type"):
                errors += 1
                continue

            # Type coercions
            try:
                mapped["packets_per_sec"] = float(mapped["packets_per_sec"] or 0)
            except ValueError:
                mapped["packets_per_sec"] = 0.0
            try:
                mapped["bytes"] = int(float(mapped["bytes"] or 0))
            except ValueError:
                mapped["bytes"] = 0
            try:
                mapped["flow_duration"] = float(mapped["flow_duration"] or 0)
            except ValueError:
                mapped["flow_duration"] = 0.0

            # Normalise protocol number → name
            proto = mapped.get("protocol", "")
            mapped["protocol"] = PROTOCOL_MAP.get(proto, proto or "TCP")

            # Derived fields
            attack_type = mapped["attack_type"]
            mapped["severity"]   = _derive_severity(attack_type)
            mapped["id"]         = str(uuid.uuid4())
            mapped["timestamp"]  = now
            mapped["confidence"] = 1.0

            data_store.add_event(mapped)
            process_event(mapped, data_store)
            update_risk(mapped, data_store)
            loaded += 1

        except Exception:
            errors += 1

    return {"loaded": loaded, "errors": errors}
