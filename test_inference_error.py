#!/usr/bin/env python3
"""Test script to reproduce the inference error."""

import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Get auth token
def get_auth_token():
    timestamp = int(__import__('time').time())
    response = requests.post(f"{BASE_URL}/auth/signup", json={
        "username": f"test_{timestamp}",
        "email": f"test_{timestamp}@example.com",
        "password": "test123"
    })
    print(f"Signup status: {response.status_code}")
    print(f"Signup response: {response.text}")
    if response.status_code in [200, 201]:
        return response.json()["access_token"]
    raise Exception(f"Auth failed: {response.text}")

# Step 2: Create run
def create_run(token):
    payload = {
        "timezone": "America/New_York",
        "specimens": [
            {
                "specimen_id": "test_spec_isf",
                "specimen_type": "ISF",
                "collected_at": "2025-01-28T12:00:00Z",
                "source_detail": "test",
                "raw_values": {
                    "glucose": 95.0,
                    "lactate": 2.1,
                    "sodium_na": 140.0,
                    "potassium_k": 4.0,
                    "chloride_cl": 100.0
                },
                "units": {
                    "glucose": "mg/dL",
                    "lactate": "mmol/L",
                    "sodium_na": "mmol/L",
                    "potassium_k": "mmol/L",
                    "chloride_cl": "mmol/L"
                },
                "missingness": {
                    "glucose": {"is_missing": False, "missing_type": None, "missing_impact": "neutral", "provenance": "measured", "confidence_0_1": 1.0},
                    "lactate": {"is_missing": False, "missing_type": None, "missing_impact": "neutral", "provenance": "measured", "confidence_0_1": 1.0},
                    "sodium_na": {"is_missing": False, "missing_type": None, "missing_impact": "neutral", "provenance": "measured", "confidence_0_1": 1.0},
                    "potassium_k": {"is_missing": False, "missing_type": None, "missing_impact": "neutral", "provenance": "measured", "confidence_0_1": 1.0},
                    "chloride_cl": {"is_missing": False, "missing_type": None, "missing_impact": "neutral", "provenance": "measured", "confidence_0_1": 1.0}
                }
            }
        ],
        "non_lab_inputs": {
            "demographics": {"age": 34, "sex_at_birth": "male"},
            "anthropometrics": {},
            "vitals_physiology": {},
            "sleep_activity": {},
            "intake_exposure": {}
        },
        "qualitative_inputs": {}
    }
    
    response = requests.post(
        f"{BASE_URL}/runs/v2",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Create run status: {response.status_code}")
    print(f"Create run response: {response.text[:500]}")
    
    if response.status_code == 201:
        return response.json()["run_id"]
    raise Exception(f"Run creation failed: {response.text}")

# Step 3: Preprocess
def preprocess(run_id, token):
    response = requests.post(
        f"{BASE_URL}/ai/preprocess-v2",
        json={"run_id": run_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Preprocess status: {response.status_code}")
    print(f"Preprocess response: {response.text[:500]}")
    return response.status_code == 201

# Step 4: Inference
def inference(run_id, token):
    response = requests.post(
        f"{BASE_URL}/ai/inference/v2",
        json={"run_id": run_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Inference status: {response.status_code}")
    print(f"Inference response: {response.text}")
    return response.status_code == 200

if __name__ == "__main__":
    try:
        token = get_auth_token()
        print(f"✓ Got auth token")
        
        run_id = create_run(token)
        print(f"✓ Created run: {run_id}")
        
        if preprocess(run_id, token):
            print(f"✓ Preprocessing complete")
        
        if inference(run_id, token):
            print(f"✓ Inference complete")
        else:
            print("✗ Inference failed - check error above")
    except Exception as e:
        print(f"✗ Error: {e}")
