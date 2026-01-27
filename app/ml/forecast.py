from typing import Dict, List
import numpy as np


def forecast_next_step(features: List[float], steps_ahead: int = 1) -> Dict:
    """
    Simple stub forecast using linear extrapolation.
    In production, would use proper time-series model (ARIMA, Prophet, etc).
    """
    if len(features) < 2:
        return {
            "forecast": float(features[-1]) if features else 0.0,
            "steps_ahead": steps_ahead,
            "confidence": 0.3,  # Low confidence for stub
            "method": "stub_linear_extrapolation",
        }

    arr = np.array(features, dtype=float)
    # Simple linear trend
    trend = arr[-1] - arr[-2]
    forecast_value = float(arr[-1] + trend * steps_ahead)

    return {
        "forecast": forecast_value,
        "steps_ahead": steps_ahead,
        "confidence": 0.4,  # Low confidence for stub
        "method": "linear_extrapolation",
        "trend": float(trend),
    }


def batch_forecast(feature_sequences: List[List[float]], steps_ahead: int = 1) -> List[Dict]:
    """Forecast for multiple sequences."""
    return [forecast_next_step(seq, steps_ahead) for seq in feature_sequences]
