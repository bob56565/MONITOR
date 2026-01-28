# MONITOR API - ISF/Specimen Inference MVP Backend

A FastAPI-based backend for sensor data ingestion, preprocessing, and ML inference. This MVP provides endpoints for user authentication, raw sensor data ingestion, calibration/preprocessing, and inference with uncertainty quantification.

## Features

- **Authentication**: Signup and login with bcrypt password hashing
- **Raw Data Ingestion**: Endpoint to submit raw sensor readings
- **Preprocessing**: Calibration and feature engineering pipeline
- **ML Inference**: Lightweight MVP model with uncertainty heuristics
- **Forecasting**: Simple trend-based forecasting stub
- **Database**: SQLAlchemy ORM with PostgreSQL (configurable)
- **Testing**: Comprehensive pytest suite with end-to-end workflows
- **Docker Support**: docker-compose setup for PostgreSQL and API

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL (or use docker-compose)
- pip

### Local Development

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up database** (using SQLite by default for testing):
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monitor"
   python -c "from app.db.session import engine; from app.db.base import Base; Base.metadata.create_all(bind=engine)"
   ```

3. **Run the API**:
   ```bash
   uvicorn app.main:app --reload
   ```

   API will be available at `http://localhost:8000`

4. **Run tests**:
   ```bash
   pytest -q
   ```

### Docker Setup

1. **Build and run with docker-compose**:
   ```bash
   docker-compose up --build
   ```

   API will be available at `http://localhost:8000`
   PostgreSQL will be available at `localhost:5432`

2. **Run migrations** (if using Alembic):
   ```bash
   docker-compose exec api alembic upgrade head
   ```

## API Endpoints

### Health Check
- `GET /health` - Service status

### Authentication
- `POST /auth/signup` - Create new user
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```
- `POST /auth/login` - Authenticate user
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```

### Data Management
- `POST /data/raw` - Ingest raw sensor data (requires `user_id` param)
  ```json
  {
    "sensor_value_1": 1.5,
    "sensor_value_2": 2.5,
    "sensor_value_3": 3.5
  }
  ```
- `POST /data/preprocess` - Calibrate and extract features (requires `user_id` param)
  ```json
  {"raw_sensor_id": 1}
  ```

### AI/ML
- `POST /ai/infer` - Run inference on calibrated features (requires `user_id` param)
  ```json
  {"calibrated_feature_id": 1}
  ```
  **Response**: Stable InferenceReport contract with complete schema (see Example Workflow)
- `POST /ai/forecast` - Simple forecast (no auth required for MVP)
  ```json
  {
    "feature_values": [1.0, 1.5, 2.0],
    "steps_ahead": 1
  }
  ```

## InferenceReport Contract

The `/ai/infer` endpoint returns a stable, product-ready `InferenceReport` schema with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `trace_id` | string | Unique request identifier (UUID) |
| `created_at` | string (ISO 8601) | Timestamp of inference creation |
| `input_summary.specimen_type` | string | Type of specimen/sensor array analyzed |
| `input_summary.observed_inputs` | array | List of input features used |
| `input_summary.missing_inputs` | array | List of expected inputs not provided |
| `inferred[].name` | string | Name of inferred parameter |
| `inferred[].value` | number | Inferred value |
| `inferred[].unit` | string | Unit of measurement |
| `inferred[].confidence` | number | Confidence score (0–1) |
| `inferred[].method` | string | Method/model used for inference |
| `abnormal_flags` | array | List of abnormal conditions detected (empty if none) |
| `assumptions` | array | Explicit list of assumptions made during inference |
| `limitations` | array | Known limitations of the model/inference |
| `model_metadata.model_name` | string | Name of the inference model |
| `model_metadata.model_version` | string | Version of the inference model |
| `model_metadata.trained_on` | string | Description of training data |
| `disclaimer` | string | Legal/ethical disclaimer for MVP |

## Example Workflow

```bash
# 1. Signup
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "pass123"}'
# Response: {"user_id": 1, "email": "test@example.com", "token": "mock_token_1"}

# 2. Ingest raw data
curl -X POST "http://localhost:8000/data/raw?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"sensor_value_1": 1.0, "sensor_value_2": 2.0, "sensor_value_3": 3.0}'
# Response: {"id": 1, "user_id": 1, "sensor_value_1": 1.0, ...}

# 3. Preprocess
curl -X POST "http://localhost:8000/data/preprocess?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"raw_sensor_id": 1}'
# Response: {"id": 1, "user_id": 1, "feature_1": -0.816, "feature_2": 0.0, "feature_3": 0.816, "derived_metric": 0.178}

# 4. Infer (Returns InferenceReport with stable contract)
curl -X POST "http://localhost:8000/ai/infer?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"calibrated_feature_id": 1}'
# Response:
# {
#   "trace_id": "550e8400-e29b-41d4-a716-446655440000",
#   "created_at": "2026-01-28T12:34:56.789012",
#   "input_summary": {
#     "specimen_type": "sensor_array",
#     "observed_inputs": ["feature_1", "feature_2", "feature_3"],
#     "missing_inputs": []
#   },
#   "inferred": [
#     {
#       "name": "primary_prediction",
#       "value": 0.678,
#       "unit": "normalized_units",
#       "confidence": 0.75,
#       "method": "MVP_linear_model"
#     },
#     {
#       "name": "uncertainty_estimate",
#       "value": 0.25,
#       "unit": "probability",
#       "confidence": 0.8,
#       "method": "distance_based_heuristic"
#     }
#   ],
#   "abnormal_flags": [],
#   "assumptions": [
#     "Features have been calibrated",
#     "Input data is within expected range",
#     "Model was trained on similar specimen types"
#   ],
#   "limitations": [
#     "MVP model is linear and does not capture complex interactions",
#     "Uncertainty estimate is heuristic-based, not Bayesian",
#     "Limited training data in current MVP phase"
#   ],
#   "model_metadata": {
#     "model_name": "MONITOR_MVP_Inference",
#     "model_version": "1.0",
#     "trained_on": "synthetic_calibration_data"
#   },
#   "disclaimer": "This is an MVP model for research purposes. Do not use for clinical decisions without validation."
# }
```

## Project Structure

```
MONITOR/
├── app/
│   ├── main.py                 # FastAPI app definition
│   ├── api/
│   │   ├── auth.py            # Authentication routes
│   │   ├── data.py            # Data ingestion/preprocessing routes
│   │   ├── ai.py              # Inference/forecast routes
│   │   └── deps.py            # Dependency injection
│   ├── db/
│   │   ├── session.py         # Database session management
│   │   └── base.py            # SQLAlchemy base
│   ├── models/
│   │   └── user.py            # ORM models (User, RawSensorData, etc)
│   ├── features/
│   │   ├── calibration.py     # Sensor calibration functions
│   │   └── derived.py         # Feature engineering
│   └── ml/
│       ├── inference.py       # MVP inference model
│       └── forecast.py        # Forecasting stub
├── alembic/                    # Database migrations
├── tests/
│   └── test_api.py            # Comprehensive pytest suite
├── requirements.txt           # Python dependencies
├── docker-compose.yml         # Docker setup
└── README.md                  # This file
```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost/monitor`)
- `SQL_ECHO`: Enable SQL logging (default: `false`)

### Database

The app uses SQLAlchemy with PostgreSQL. For local development, create a `.env` file:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monitor
SQL_ECHO=false
```

## Testing

Run all tests with verbose output:
```bash
pytest -v
```

Run specific test class:
```bash
pytest tests/test_api.py::TestAuth -v
```

Coverage report:
```bash
pytest --cov=app tests/
```

## Notes

### Proxy / Offline Wheels

For environments with restricted internet access:

1. **Download wheels offline**:
   ```bash
   pip download -r requirements.txt -d ./wheels
   ```

2. **Install from wheels**:
   ```bash
   pip install --no-index --find-links ./wheels -r requirements.txt
   ```

### Production Deployment

The MVP uses mock tokens. For production:

1. **Implement JWT**: Replace mock token generation in `auth.py` with proper JWT tokens
2. **Secure secrets**: Use environment variables for secrets, not hardcoded values
3. **Database backups**: Set up automated PostgreSQL backups
4. **CORS**: Configure `CORSMiddleware` with specific allowed origins
5. **Rate limiting**: Add rate limiting middleware
6. **Model persistence**: Save/load ML models from disk or model registry

## License

MIT