from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models import User, CalibratedFeatures, InferenceResult
from app.ml.inference import infer as run_inference
from app.ml.forecast import forecast_next_step

router = APIRouter(prefix="/ai", tags=["ai"])


class InferenceRequest(BaseModel):
    calibrated_feature_id: int


class InferenceResponse(BaseModel):
    id: int
    user_id: int
    prediction: float
    confidence: float
    uncertainty: float
    created_at: datetime


class ForecastRequest(BaseModel):
    feature_values: list[float]
    steps_ahead: int = 1


class ForecastResponse(BaseModel):
    forecast: float
    confidence: float
    steps_ahead: int


@router.post("/infer", response_model=InferenceResponse)
def run_inference_endpoint(
    request: InferenceRequest,
    db: Session = Depends(get_db),
    user_id: int = None,
):
    """
    Run inference on calibrated features.
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated",
        )
    
    cal_features = db.query(CalibratedFeatures).filter(
        CalibratedFeatures.id == request.calibrated_feature_id,
        CalibratedFeatures.user_id == user_id,
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
        user_id=user_id,
        calibrated_feature_id=request.calibrated_feature_id,
        prediction=inference_result_dict["prediction"],
        confidence=inference_result_dict["confidence"],
        uncertainty=inference_result_dict["uncertainty"],
        inference_metadata=inference_result_dict,
    )
    db.add(inference_result)
    db.commit()
    db.refresh(inference_result)
    
    return InferenceResponse(
        id=inference_result.id,
        user_id=inference_result.user_id,
        prediction=inference_result.prediction,
        confidence=inference_result.confidence,
        uncertainty=inference_result.uncertainty,
        created_at=inference_result.created_at,
    )


@router.post("/forecast", response_model=ForecastResponse)
def forecast_endpoint(request: ForecastRequest):
    """
    Simple forecast endpoint (stub).
    """
    result = forecast_next_step(request.feature_values, request.steps_ahead)
    return ForecastResponse(
        forecast=result["forecast"],
        confidence=result["confidence"],
        steps_ahead=result["steps_ahead"],
    )
