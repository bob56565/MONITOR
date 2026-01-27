import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.base import Base
from app.db.session import get_db
import uuid

# Create in-memory SQLite database for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def generate_email():
    """Generate a unique email for each test."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


class TestHealth:
    """Test health check endpoint."""
    
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestAuth:
    """Test authentication endpoints: signup and login."""
    
    def test_signup(self):
        response = client.post(
            "/auth/signup",
            json={"email": generate_email(), "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "user_id" in data
        assert "token" in data
    
    def test_signup_duplicate_email(self):
        email = generate_email()
        # First signup
        client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        # Try duplicate
        response = client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_login(self):
        email = generate_email()
        # Create user
        client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        # Login
        response = client.post(
            "/auth/login",
            json={"email": email, "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email
        assert "user_id" in data
        assert "token" in data
    
    def test_login_invalid_password(self):
        email = generate_email()
        # Create user
        client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        # Try wrong password
        response = client.post(
            "/auth/login",
            json={"email": email, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_nonexistent_user(self):
        response = client.post(
            "/auth/login",
            json={"email": generate_email(), "password": "password123"}
        )
        assert response.status_code == 401


class TestDataIngestion:
    """Test data ingestion endpoints."""
    
    def setup_method(self):
        """Create a user for each test."""
        email = generate_email()
        response = client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        self.user_id = response.json()["user_id"]
    
    def test_ingest_raw_data(self):
        response = client.post(
            "/data/raw",
            json={
                "sensor_value_1": 1.5,
                "sensor_value_2": 2.5,
                "sensor_value_3": 3.5,
            },
            params={"user_id": self.user_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sensor_value_1"] == 1.5
        assert data["sensor_value_2"] == 2.5
        assert data["sensor_value_3"] == 3.5
        assert "id" in data
        self.raw_data_id = data["id"]
    
    def test_ingest_raw_data_unauthenticated(self):
        response = client.post(
            "/data/raw",
            json={
                "sensor_value_1": 1.5,
                "sensor_value_2": 2.5,
                "sensor_value_3": 3.5,
            }
        )
        assert response.status_code == 401
    
    def test_preprocess_data(self):
        # Ingest raw data first
        ingest_response = client.post(
            "/data/raw",
            json={
                "sensor_value_1": 1.0,
                "sensor_value_2": 2.0,
                "sensor_value_3": 3.0,
            },
            params={"user_id": self.user_id}
        )
        raw_id = ingest_response.json()["id"]
        
        # Preprocess
        response = client.post(
            "/data/preprocess",
            json={"raw_sensor_id": raw_id},
            params={"user_id": self.user_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "feature_1" in data
        assert "feature_2" in data
        assert "feature_3" in data
        assert "derived_metric" in data
        assert "id" in data
        self.calibrated_id = data["id"]
    
    def test_preprocess_nonexistent_raw_data(self):
        response = client.post(
            "/data/preprocess",
            json={"raw_sensor_id": 9999},
            params={"user_id": self.user_id}
        )
        assert response.status_code == 404


class TestInference:
    """Test inference endpoints."""
    
    def setup_method(self):
        """Create a user and preprocessed data for each test."""
        email = generate_email()
        response = client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        self.user_id = response.json()["user_id"]
        
        # Ingest and preprocess
        ingest_response = client.post(
            "/data/raw",
            json={
                "sensor_value_1": 2.0,
                "sensor_value_2": 3.0,
                "sensor_value_3": 4.0,
            },
            params={"user_id": self.user_id}
        )
        raw_id = ingest_response.json()["id"]
        
        preprocess_response = client.post(
            "/data/preprocess",
            json={"raw_sensor_id": raw_id},
            params={"user_id": self.user_id}
        )
        self.calibrated_id = preprocess_response.json()["id"]
    
    def test_infer(self):
        response = client.post(
            "/ai/infer",
            json={"calibrated_feature_id": self.calibrated_id},
            params={"user_id": self.user_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "prediction" in data
        assert "confidence" in data
        assert "uncertainty" in data
        assert "id" in data
        assert 0 <= data["confidence"] <= 1.0
        assert 0 <= data["uncertainty"] <= 1.0
    
    def test_infer_nonexistent_feature(self):
        response = client.post(
            "/ai/infer",
            json={"calibrated_feature_id": 9999},
            params={"user_id": self.user_id}
        )
        assert response.status_code == 404
    
    def test_forecast(self):
        response = client.post(
            "/ai/forecast",
            json={
                "feature_values": [1.0, 1.5, 2.0],
                "steps_ahead": 1
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "forecast" in data
        assert "confidence" in data
        assert "steps_ahead" in data
        assert data["steps_ahead"] == 1


class TestEndToEnd:
    """End-to-end workflow test: signup -> login -> ingest -> preprocess -> infer."""
    
    def test_full_workflow(self):
        email = generate_email()
        
        # Signup
        signup_response = client.post(
            "/auth/signup",
            json={"email": email, "password": "password123"}
        )
        assert signup_response.status_code == 200
        user_id = signup_response.json()["user_id"]
        
        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": email, "password": "password123"}
        )
        assert login_response.status_code == 200
        
        # Ingest raw data
        ingest_response = client.post(
            "/data/raw",
            json={
                "sensor_value_1": 5.0,
                "sensor_value_2": 6.0,
                "sensor_value_3": 7.0,
            },
            params={"user_id": user_id}
        )
        assert ingest_response.status_code == 200
        raw_id = ingest_response.json()["id"]
        
        # Preprocess
        preprocess_response = client.post(
            "/data/preprocess",
            json={"raw_sensor_id": raw_id},
            params={"user_id": user_id}
        )
        assert preprocess_response.status_code == 200
        calibrated_id = preprocess_response.json()["id"]
        
        # Infer
        infer_response = client.post(
            "/ai/infer",
            json={"calibrated_feature_id": calibrated_id},
            params={"user_id": user_id}
        )
        assert infer_response.status_code == 200
        inference_data = infer_response.json()
        assert "prediction" in inference_data
        assert "confidence" in inference_data
        assert "uncertainty" in inference_data
