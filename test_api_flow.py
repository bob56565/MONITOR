import requests
import json

BASE_URL = "http://localhost:8000"

# 1. Signup
print("=== 1. Signup ===")
signup_resp = requests.post(
    f"{BASE_URL}/auth/signup",
    json={"email": "abe+1@test.com", "password": "StrongPass123!", "name": "Abe"}
)
print(f"Status: {signup_resp.status_code}")
signup_data = signup_resp.json()
print(json.dumps(signup_data, indent=2))
token = signup_data["access_token"]
print(f"\nToken: {token}\n")

# 2. Ingest raw data
print("=== 2. Ingest Raw Data ===")
headers = {"Authorization": f"Bearer {token}"}
raw_resp = requests.post(
    f"{BASE_URL}/data/raw",
    headers=headers,
    json={
        "timestamp": "2026-01-27T00:00:00Z",
        "specimen_type": "blood",
        "observed": {"glucose_mg_dl": 128, "lactate_mmol_l": 2.1},
        "context": {"age": 30, "sex": "M", "fasting": False}
    }
)
print(f"Status: {raw_resp.status_code}")
raw_data = raw_resp.json()
print(json.dumps(raw_data, indent=2))
raw_id = raw_data["id"]
print(f"\nRaw ID: {raw_id}\n")

# 3. Preprocess
print("=== 3. Preprocess ===")
pre_resp = requests.post(
    f"{BASE_URL}/data/preprocess",
    headers=headers,
    json={"raw_id": raw_id}
)
print(f"Status: {pre_resp.status_code}")
pre_data = pre_resp.json()
print(json.dumps(pre_data, indent=2))
pre_id = pre_data["id"]
print(f"\nPreprocessed ID: {pre_id}\n")

# 4. Infer
print("=== 4. Infer ===")
infer_resp = requests.post(
    f"{BASE_URL}/ai/infer",
    headers=headers,
    json={"calibrated_id": pre_id}
)
print(f"Status: {infer_resp.status_code}")
infer_data = infer_resp.json()
print(json.dumps(infer_data, indent=2))

print("\n=== Complete Workflow Success! ===")
