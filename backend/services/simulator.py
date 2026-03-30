"""
simulator.py — Traffic simulation service.
Loads dataset, manages background simulation loop, and injects synthetic attacks.
"""

import asyncio
import csv
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from services.data_store import data_store

# ── Global severity map (Derived rules) ────────────────────────────────────────
def _derive_severity(attack_type: str) -> str:
    at_upper = attack_type.upper()
    if at_upper == "BENIGN": return "Low"
    if "DOS" in at_upper: return "Critical"
    if "PORTSCAN" in at_upper: return "Medium"
    if "BRUTEFORCE" in at_upper: return "High"
    if "BOT" in at_upper: return "High"
    if "WEB ATTACK" in at_upper: return "Medium"
    if "INFILTRATION" in at_upper: return "Critical"
    return "Medium"


def load_dataset(path: str) -> list[dict[str, Any]]:
    """
    Reads CSV, maps columns to schema, derives severity,
    assigns id+timestamp, and returns a list of dictionaries.
    Called once at startup.
    """
    if not os.path.exists(path):
        return []

    events = []
    
    # Optional performance optimisation: pre-calculate mapping
    col_map = {
        ' Source IP': 'src_ip',
        ' Destination IP': 'dst_ip',
        ' Protocol': 'protocol',
        ' Label': 'attack_type',
        ' Packets/s': 'packets_per_sec',
        ' Total Length of Fwd Packets': 'bytes',
        ' Flow Duration': 'flow_duration'
    }

    with open(path, mode='r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            now_iso = datetime.now(timezone.utc).isoformat()
            
            # Extract fields with fallbacks for exact or stripped keys
            src_ip = row.get(' Source IP', row.get('Source IP', '0.0.0.0')).strip()
            dst_ip = row.get(' Destination IP', row.get('Destination IP', '0.0.0.0')).strip()
            protocol = row.get(' Protocol', row.get('Protocol', 'TCP')).strip()
            attack_type = row.get(' Label', row.get('Label', 'BENIGN')).strip()
            
            # Numeric coercions
            try:
                pps = float(row.get(' Packets/s', row.get('Packets/s', 0.0)))
            except ValueError:
                pps = 0.0
                
            try:
                b = int(float(row.get(' Total Length of Fwd Packets', row.get('Total Length of Fwd Packets', 0))))
            except ValueError:
                b = 0
                
            try:
                fd = float(row.get(' Flow Duration', row.get('Flow Duration', 0.0)))
            except ValueError:
                fd = 0.0
                
            # Timestamp fallback to current time
            ts_val = row.get(' Timestamp', row.get('Timestamp', '')).strip()
            if not ts_val:
                ts_val = now_iso
                
            events.append({
                "id": str(uuid.uuid4()),
                "timestamp": ts_val,
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "protocol": protocol,
                "packets_per_sec": pps,
                "bytes": b,
                "flow_duration": fd,
                "attack_type": attack_type,
                "confidence": 1.0,  # default based on contract
                "severity": _derive_severity(attack_type)
            })
            
            # If dataset is huge, cap memory per prompt (Rolling buffer: drop oldest if > 10,000)
            # We could cap it during stream or insertion, but doing it here prevents OOM on huge files
            if len(events) > 10_000:
                events = events[-10_000:]

    return events


def start_simulation() -> None:
    """Toggle sim_running to True."""
    data_store.sim_running = True


def stop_simulation() -> None:
    """Toggle sim_running to False."""
    data_store.sim_running = False


async def background_sim_loop() -> None:
    """
    Every 100-300ms: if sim_running -> advance pointer -> run alert engine -> run risk engine.
    Does NOT push to clients directly.
    """
    from services.alert_engine import process_event
    from services.risk_engine import update_risk

    while True:
        await asyncio.sleep(random.uniform(0.1, 0.3))
        
        events = data_store.events
        if data_store.sim_running and len(events) > 0:
            # Advance pointer
            data_store.sim_pointer += 1
            
            # Loops back to 0 when pointer reaches end
            if data_store.sim_pointer >= len(events):
                data_store.sim_pointer = 0

            # Run engines
            current_event = events[data_store.sim_pointer]
            process_event(current_event, data_store)
            update_risk(current_event, data_store)


def inject_attack(attack_type: str) -> list[dict[str, Any]]:
    """
    Generates 10-20 synthetic events matching schema.
    Supported: DoS, PortScan, SSH BruteForce, Botnet.
    Confidence = 0.95. Id = uuid4. Timestamp = current.
    """
    if attack_type not in ["DoS", "PortScan", "SSH BruteForce", "Botnet"]:
        raise ValueError(f"Unsupported attack type '{attack_type}'")

    num_events = random.randint(10, 20)
    injected: list[dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()
    base_src_ip = f"10.0.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    for i in range(num_events):
        # Base template matching the contract
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "src_ip": base_src_ip,
            "dst_ip": f"192.168.1.{random.randint(1, 255)}",
            "protocol": "6",  # default TCP
            "packets_per_sec": 100.0,
            "bytes": 500,
            "flow_duration": 1.0,
            "attack_type": attack_type,
            "confidence": 0.95,
            "severity": _derive_severity(attack_type)
        }
        
        # Attack-specific traits per requirements
        if attack_type == "DoS":
            # high packets_per_sec (5000-50000), short flow_duration
            event["packets_per_sec"] = random.uniform(5000, 50000)
            event["flow_duration"] = random.uniform(0.001, 0.5)
            
        elif attack_type == "PortScan":
            # many dst_ip variants, medium packets_per_sec
            event["dst_ip"] = f"192.168.1.{i+1}"
            event["packets_per_sec"] = random.uniform(500, 1500)
            
        elif attack_type == "SSH BruteForce":
            # repeated src_ip, protocol=6, low bytes
            event["src_ip"] = base_src_ip
            event["protocol"] = "6"
            event["bytes"] = random.randint(40, 100)
            
        elif attack_type == "Botnet":
            # periodic low packets_per_sec, varied dst_ip
            event["dst_ip"] = f"10.0.0.{random.randint(1, 100)}"
            event["packets_per_sec"] = random.uniform(10, 50)
            
        injected.append(event)
        data_store.add_event(event)
        
    # Engines trigger automatically on injected events because /api/simulate implies it,
    # or the background sim loop will catch them. Spec says inject into DataStore.events.
    # Usually we want immediate evaluation. Let's do it immediately.
    from services.alert_engine import process_event
    from services.risk_engine import update_risk
    for event in injected:
        process_event(event, data_store)
        update_risk(event, data_store)

    return injected
