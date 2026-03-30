# Network IDS Frontend Integration Handoff

## Project Context
This backend serves an AI-powered Network Intrusion Detection System (IDS) for GDG WIT '26 Hackathon (VIT Vellore, Problem Statement 3).

The backend model pipeline is complete and running successfully.

## Backend Status
- API is implemented with FastAPI.
- Health endpoint is reachable.
- Prediction endpoint is ready for frontend integration.
- Model artifacts are loaded from local files in the project root.

## Base URL
Use this base URL for local development:

http://127.0.0.1:8000

If frontend runs on another device on the same Wi-Fi, replace localhost with the backend machine LAN IP (example: http://192.168.1.20:8000).

## Available Endpoints

### 1) Health Check
Method: GET
Path: /health

Full URL:
http://127.0.0.1:8000/health

Success response:
{
  "status": "ok"
}

### 2) Feature List
Method: GET
Path: /features

Full URL:
http://127.0.0.1:8000/features

Purpose:
Returns top selected features expected by the trained model.

Success response:
{
  "selected_features": ["feature_1", "feature_2", "..."]
}

### 3) Predict Intrusion
Method: POST
Path: /predict
Content-Type: application/json

Full URL:
http://127.0.0.1:8000/predict

Request body schema:
{
  "flow_features": {
    "<feature_name>": <number>,
    "<feature_name>": <number>
  }
}

Minimal example request:
{
  "flow_features": {
    "flow_duration": 1200,
    "flow_packets/s": 15.2,
    "syn_flag_count": 2
  }
}

Notes:
- Missing model features are auto-filled as 0.0 by backend.
- Sending more feature keys than required is safe; only selected features are used.

Success response schema:
{
  "attack_type": "Benign",
  "risk_score": 18.42,
  "confidence": 0.9731,
  "top_3_shap_features": [
    ["flow_packets/s", "low", -0.1221],
    ["syn_flag_count", "high", 0.0873],
    ["packet_length_variance", "low", -0.0542]
  ],
  "plain_english_explanation": "Human-readable explanation of why this was predicted"
}

## UI Mapping Recommendations

### Severity Rules
- 0 to 40: Clean
- 40 to 70: Suspicious
- 70 to 100: Threat

### Suggested Badge Colors
- Clean: Green
- Suspicious: Amber/Yellow
- Threat: Red

### Suggested Main Components
1. Input form / flow packet JSON editor
2. Predict button
3. Result card with:
   - Attack Type
   - Risk Score
   - Confidence
   - Top 3 SHAP Features
   - Plain English Explanation
4. Severity banner based on risk score

## Frontend Fetch Example (JavaScript)

async function predictFlow(flowFeatures) {
  const response = await fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      flow_features: flowFeatures
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction request failed");
  }

  return response.json();
}

// Example usage
// predictFlow({"flow_duration": 1200, "flow_packets/s": 15.2, "syn_flag_count": 2})
//   .then(console.log)
//   .catch(console.error);

## cURL Test Commands

Health:
curl -X GET "http://127.0.0.1:8000/health"

Features:
curl -X GET "http://127.0.0.1:8000/features"

Predict:
curl -X POST "http://127.0.0.1:8000/predict" ^
  -H "Content-Type: application/json" ^
  -d "{\"flow_features\":{\"flow_duration\":1200,\"flow_packets/s\":15.2,\"syn_flag_count\":2}}"

## Backend Run Instructions (for Demo)
From project root:

Windows PowerShell:
.\ids_env\Scripts\python.exe run_api.py

Then open docs:
http://127.0.0.1:8000/docs

## Demo Day Checklist
1. Start backend API and keep terminal open.
2. Verify health endpoint returns status ok.
3. Open frontend app.
4. Run one benign-like sample and one attack-like sample.
5. Show risk score transition (Clean -> Suspicious -> Threat).
6. Show explainability output (top_3_shap_features + plain_english_explanation).

## Common Issues and Fixes

### Issue: "Cannot reach page"
- Ensure backend terminal is running.
- Confirm URL is http://127.0.0.1:8000/docs.
- If port conflict occurs, stop old process using port 8000 and restart.

### Issue: "Only one usage of each socket address"
- Another server already uses port 8000.
- Close previous backend terminal or kill old process.

### Issue: CORS errors in browser
- Backend is configured with open CORS.
- Usually means wrong URL/port or backend not running.

### Issue: 500 Prediction failed
- Check model artifact files exist in project root:
  - rf_model.onnx
  - rf_model.pkl
  - iso_model.pkl
  - scaler.pkl
  - label_encoder.pkl
  - selected_features.txt

## Files Relevant to Frontend Integration
- API server: api_server.py
- Runner: run_api.py
- Predictor module: predictor.py
- Model artifacts: rf_model.onnx, iso_model.pkl, scaler.pkl, label_encoder.pkl, selected_features.txt

## Contact/Coordination Notes
- Frontend can proceed independently using /predict and /features.
- Backend side currently stable for local demo usage.
