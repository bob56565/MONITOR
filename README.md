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
- `POST /ai/forecast` - Simple forecast (no auth required for MVP)
  ```json
  {
    "feature_values": [1.0, 1.5, 2.0],
    "steps_ahead": 1
  }
  ```

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

# 4. Infer
curl -X POST "http://localhost:8000/ai/infer?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"calibrated_feature_id": 1}'
# Response: {"id": 1, "user_id": 1, "prediction": 0.678, "confidence": 0.45, "uncertainty": 0.55}
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