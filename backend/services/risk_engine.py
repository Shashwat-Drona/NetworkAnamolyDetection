SEVERITY_WEIGHT = {
    "Low": 1,
    "Medium": 2,
    "High": 3,
    "Critical": 4
}

def update_risk(event, store):
    """
    Called on every new event.
    Accumulates raw score per src_ip in DataStore.risk_scores.
    After accumulation, normalizes all scores 0-100 using min-max.
    Stores normalized scores back into DataStore.risk_scores.
    """
    attack_type = event.get("attack_type", "BENIGN")
    if attack_type == "BENIGN":
        return
        
    src_ip = event.get("src_ip")
    if not src_ip:
        return
        
    severity = event.get("severity", "Low")
    weight = SEVERITY_WEIGHT.get(severity, 1)

    # Risk scores dictionary will store complex metadata mapped by IP
    score_data = store.risk_scores.get(src_ip)
    if not isinstance(score_data, dict):
        score_data = {
            "raw_score": 0.0,
            "score": 0.0,
            "event_count": 0,
            "attack_types": {}
        }
    
    # Accumulate
    score_data["raw_score"] += weight
    score_data["event_count"] += 1
    score_data["attack_types"][attack_type] = score_data["attack_types"].get(attack_type, 0) + 1
    
    # Set the dictionary
    store.risk_scores[src_ip] = score_data
    
    # Normalize 0-100 based on raw_score min and max across all ips
    all_raw = [
        data["raw_score"] 
        for data in store.risk_scores.values() 
        if isinstance(data, dict)
    ]
    if all_raw:
        min_val = min(all_raw)
        max_val = max(all_raw)
        
        for ip, data in store.risk_scores.items():
            if isinstance(data, dict):
                # Calculate top_attack_type for this entry
                if data.get("attack_types"):
                    data["top_attack_type"] = max(data["attack_types"].items(), key=lambda x: x[1])[0]
                else:
                    data["top_attack_type"] = "BENIGN"

                if max_val == min_val:
                    data["score"] = 100.0 if max_val > 0 else 0.0
                else:
                    data["score"] = ((data["raw_score"] - min_val) / (max_val - min_val)) * 100.0

def get_risk_list(store):
    """
    Returns sorted list: [{ src_ip, score, event_count, top_attack_type }]
    sorted by score descending
    """
    results = []
    for ip, data in store.risk_scores.items():
        if not isinstance(data, dict) or data["event_count"] == 0:
            continue
            
        top_attack = "Unknown"
        if data["attack_types"]:
            top_attack = max(data["attack_types"].items(), key=lambda x: x[1])[0]
            
        results.append({
            "src_ip": ip,
            "score": round(data["score"], 2),
            "event_count": data["event_count"],
            "top_attack_type": top_attack
        })
        
    # Sorted by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
