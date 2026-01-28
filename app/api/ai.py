from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid
from app.db.session import get_db
from app.models import User, CalibratedFeatures, InferenceResult
from app.ml.inference import infer as run_inference
from app.ml.forecast import forecast_next_step
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class InferenceRequest(BaseModel):
    calibrated_id: int


# Legacy response model (kept for backward compatibility if needed)
class InferenceResponse(BaseModel):
    id: int
    prediction: float
    confidence: float
    uncertainty: float
    created_at: datetime

    class Config:
        from_attributes = True


# New stable "User Report" contract
class InputSummary(BaseModel):
    specimen_type: str
    observed_inputs: List[str]
    missing_inputs: List[str]


class InferredValue(BaseModel):
    name: str
    value: float
    unit: str
    confidence: float = Field(..., ge=0, le=1)
    method: str


class ModelMetadata(BaseModel):
    model_name: str
    model_version: str
    trained_on: str


class InferenceReport(BaseModel):
    trace_id: str
    created_at: str  # ISO timestamp
    input_summary: InputSummary
    inferred: List[InferredValue]
    abnormal_flags: List[str]
    assumptions: List[str]
    limitations: List[str]
    model_metadata: ModelMetadata
    disclaimer: str


class ForecastRequest(BaseModel):
    feature_values: list[float]
    steps_ahead: int = 1
    horizon_steps: int = 1


class ForecastResponse(BaseModel):
    forecast: float
    forecasts: List[float] = []
    confidence: float
    steps_ahead: int


@router.post("/infer", response_model=InferenceReport, status_code=201)
def run_inference_endpoint(
    request: InferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run inference on calibrated features and return structured InferenceReport.
    
    Returns a stable contract with all required fields for production use.
    """
    cal_features = db.query(CalibratedFeatures).filter(
        CalibratedFeatures.id == request.calibrated_id,
        CalibratedFeatures.user_id == current_user.id,
    ).first()
    
    if not cal_features:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calibrated features not found",
        )
    
    # Perform inference
    features = [cal_features.feature_1, cal_features.feature_2, cal_features.feature_3]
    inference_result_dict = run_inference(features)
    
    # Store result
    inference_result = InferenceResult(
        user_id=current_user.id,
        calibrated_feature_id=request.calibrated_id,
        prediction=inference_result_dict["prediction"],
        confidence=inference_result_dict["confidence"],
        uncertainty=inference_result_dict["uncertainty"],
        inference_metadata=inference_result_dict,
    )
    db.add(inference_result)
    db.commit()
    db.refresh(inference_result)
    
    # Build structured InferenceReport
    trace_id = str(uuid.uuid4())
    
    # Ensure confidence is between 0 and 1
    confidence = float(inference_result_dict["confidence"])
    confidence = max(0.0, min(1.0, confidence))
    
    # Construct the inferred values array
    inferred_values = [
        InferredValue(
            name="primary_prediction",
            value=float(inference_result_dict["prediction"]),
            unit="normalized_units",
            confidence=confidence,
            method="MVP_linear_model",
        ),
        InferredValue(
            name="uncertainty_estimate",
            value=float(inference_result_dict["uncertainty"]),
            unit="probability",
            confidence=0.8,
            method="distance_based_heuristic",
        ),
    ]
    
    report = InferenceReport(
        trace_id=trace_id,
        created_at=inference_result.created_at.isoformat(),
        input_summary=InputSummary(
            specimen_type="sensor_array",
            observed_inputs=["feature_1", "feature_2", "feature_3"],
            missing_inputs=[],
        ),
        inferred=inferred_values,
        abnormal_flags=[],
        assumptions=[
            "Features have been calibrated",
            "Input data is within expected range",
            "Model was trained on similar specimen types",
        ],
        limitations=[
            "MVP model is linear and does not capture complex interactions",
            "Uncertainty estimate is heuristic-based, not Bayesian",
            "Limited training data in current MVP phase",
        ],
        model_metadata=ModelMetadata(
            model_name="MONITOR_MVP_Inference",
            model_version="1.0",
            trained_on="synthetic_calibration_data",
        ),
        disclaimer="This is an MVP model for research purposes. Do not use for clinical decisions without validation.",
    )
    
    return report


@router.post("/forecast", response_model=ForecastResponse)
def forecast_endpoint(request: ForecastRequest):
    """
    Simple forecast endpoint.
    Uses horizon_steps (or steps_ahead) to generate multi-step forecast.
    """
    # Use horizon_steps if provided, otherwise fall back to steps_ahead
    steps = max(1, request.horizon_steps or request.steps_ahead)
    
    result = forecast_next_step(request.feature_values, steps_ahead=steps)
    
    # Ensure forecasts list is populated
    forecasts = result.get("forecasts", [])
    if not forecasts and "forecast" in result:
        # Backward compatibility: if only forecast exists, wrap it
        forecasts = [result["forecast"]]
    
    return ForecastResponse(
        forecast=result["forecast"],
        forecasts=forecasts,
        confidence=result["confidence"],
        steps_ahead=result["steps_ahead"],
    )
