from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import predictor


class PredictRequest(BaseModel):
    flow_features: Dict[str, float] = Field(
        ..., description="Dictionary of CICIDS flow features keyed by feature name"
    )


class PredictResponse(BaseModel):
    attack_type: str
    risk_score: float
    confidence: float
    top_3_shap_features: List[List[Any]]
    plain_english_explanation: str


app = FastAPI(
    title="GDG WIT IDS API",
    description="FastAPI wrapper for Raspberry Pi-friendly network intrusion detection",
    version="1.0.0",
)

# Keep CORS open for hackathon frontend velocity.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def warmup() -> None:
    # Preload model artifacts once to avoid first-request latency spikes.
    try:
        predictor._ensure_loaded()
    except Exception as exc:
        raise RuntimeError(f"Model warmup failed: {exc}")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/features")
def features() -> Dict[str, List[str]]:
    path = Path("selected_features.txt")
    if not path.exists():
        raise HTTPException(status_code=500, detail="selected_features.txt not found")

    selected = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return {"selected_features": selected}


@app.post("/predict", response_model=PredictResponse)
def predict_endpoint(payload: PredictRequest) -> Dict[str, Any]:
    try:
        result = predictor.predict(payload.flow_features)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    # Ensure response is fully JSON-serializable.
    result["top_3_shap_features"] = [list(item) for item in result.get("top_3_shap_features", [])]
    result["risk_score"] = float(result.get("risk_score", 0.0))
    result["confidence"] = float(result.get("confidence", 0.0))

    return result
