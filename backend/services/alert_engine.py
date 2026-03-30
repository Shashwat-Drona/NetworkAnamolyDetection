import uuid
from datetime import datetime, timezone

def process_event(event, store):
    """
    Called on every new event.
    - If attack_type == "BENIGN" -> skip
    - Dedup: if (src_ip + attack_type) seen within last 60s -> increment count on existing alert, skip insert
    - Otherwise: create new alert: { id: uuid4, timestamp, src_ip, attack_type, severity, count: 1 }
    - Append to DataStore.alerts
    - Max 1,000 alerts in memory — drop oldest if exceeded
    """
    attack_type = event.get("attack_type", "BENIGN")
    if attack_type == "BENIGN":
        return

    src_ip = event.get("src_ip")
    if not src_ip:
        return

    current_time_str = event.get("timestamp", datetime.now(timezone.utc).isoformat())
    try:
        current_time = datetime.fromisoformat(current_time_str.replace('Z', '+00:00'))
    except ValueError:
        current_time = datetime.now(timezone.utc)

    # Dedup check limit 60 seconds
    matched_alert = None
    for alert in reversed(store.alerts):
        if alert.get("src_ip") == src_ip and alert.get("attack_type") == attack_type:
            alert_time_str = alert.get("timestamp", "")
            try:
                alert_time = datetime.fromisoformat(alert_time_str.replace('Z', '+00:00'))
                diff = (current_time - alert_time).total_seconds()
                if 0 <= diff <= 60:
                    matched_alert = alert
                    break
            except ValueError:
                pass

    if matched_alert:
        matched_alert["count"] = matched_alert.get("count", 1) + 1
        return

    # Create new alert
    new_alert = {
        "id": str(uuid.uuid4()),
        "timestamp": current_time_str,
        "src_ip": src_ip,
        "attack_type": attack_type,
        "severity": event.get("severity", "Low"),
        "count": 1
    }
    
    # Append to DataStore.alerts as instructed
    store.add_alert(new_alert)
    
    # Max 1,000 alerts in memory
    while len(store.alerts) > 1000:
        store.alerts.pop(0)
