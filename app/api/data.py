from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.models import User, RawSensorData, CalibratedFeatures
from app.features.calibration import calibrate_sensor_readings, get_calibration_metadata
from app.features.derived import compute_derived_metric

router = APIRouter(prefix="/data", tags=["data"])


class RawDataRequest(BaseModel):
    sensor_value_1: float
    sensor_value_2: float
    sensor_value_3: float


class RawDataResponse(BaseModel):
    id: int
    user_id: int
    timestamp: datetime
    sensor_value_1: float
    sensor_value_2: float
    sensor_value_3: float


class PreprocessRequest(BaseModel):
    raw_sensor_id: int


class PreprocessResponse(BaseModel):
    id: int
    user_id: int
    feature_1: float
    feature_2: float
    feature_3: float
    derived_metric: float
    created_at: datetime


@router.post("/raw", response_model=RawDataResponse)
def ingest_raw_data(
    request: RawDataRequest,
    db: Session = Depends(get_db),
    user_id: int = None,
):
    """Ingest raw sensor data."""
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    raw_data = RawSensorData(
        user_id=user_id,
        sensor_value_1=request.sensor_value_1,
        sensor_value_2=request.sensor_value_2,
        sensor_value_3=request.sensor_value_3,
        raw_data={
            "v1": request.sensor_value_1,
            "v2": request.sensor_value_2,
            "v3": request.sensor_value_3,
        }
    )
    db.add(raw_data)
    db.commit()
    db.refresh(raw_data)
    
    return RawDataResponse(
        id=raw_data.id,
        user_id=raw_data.user_id,
        timestamp=raw_data.timestamp,
        sensor_value_1=raw_data.sensor_value_1,
        sensor_value_2=raw_data.sensor_value_2,
        sensor_value_3=raw_data.sensor_value_3,
    )


@router.post("/preprocess", response_model=PreprocessResponse)
def preprocess_data(
    request: PreprocessRequest,
    db: Session = Depends(get_db),
    user_id: int = None,
):
    """
    Preprocess raw sensor data: calibration + feature extraction.
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated",
        )
    
    raw_data = db.query(RawSensorData).filter(
        RawSensorData.id == request.raw_sensor_id,
        RawSensorData.user_id == user_id,
    ).first()
    
    if not raw_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw sensor data not found",
        )
    
    # Calibration
    raw_values = [raw_data.sensor_value_1, raw_data.sensor_value_2, raw_data.sensor_value_3]
    calibrated = calibrate_sensor_readings(raw_values)
    
    # Feature engineering
    derived = compute_derived_metric(calibrated)
    
    # Store calibrated features
    cal_features = CalibratedFeatures(
        user_id=user_id,
        raw_sensor_id=request.raw_sensor_id,
        feature_1=calibrated[0],
        feature_2=calibrated[1],
        feature_3=calibrated[2],
        derived_metric=derived,
    )
    db.add(cal_features)
    db.commit()
    db.refresh(cal_features)
    
    return PreprocessResponse(
        id=cal_features.id,
        user_id=cal_features.user_id,
        feature_1=cal_features.feature_1,
        feature_2=cal_features.feature_2,
        feature_3=cal_features.feature_3,
        derived_metric=cal_features.derived_metric,
        created_at=cal_features.created_at,
    )
