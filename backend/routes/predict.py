from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.ml_engine import ml_engine

router = APIRouter(tags=["predict"])

class PredictRequest(BaseModel):
    flow_features: Dict[str, float] = Field(
        ..., description="Dictionary of network flow features"
    )

class PredictResponse(BaseModel):
    attack_type: str
    risk_score: float
    confidence: float
    top_3_shap_features: List[List[Any]]
    plain_english_explanation: str

@router.get("/features")
def features() -> Dict[str, List[str]]:
    if not ml_engine.selected_features:
        raise HTTPException(status_code=500, detail="Models not loaded properly or selected_features is empty")
    return {"selected_features": ml_engine.selected_features}

@router.post("/predict", response_model=PredictResponse)
def predict_endpoint(payload: PredictRequest) -> Dict[str, Any]:
    try:
        result = ml_engine.predict(payload.flow_features)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")
