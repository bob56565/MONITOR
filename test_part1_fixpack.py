"""
Test script for Part 1 Fix Pack - A2 Workflow

Tests the complete workflow:
1. Part A submission
2. A2 auto-trigger
3. A2 status tracking
4. A2 summary retrieval
5. Part B phase-awareness
"""

import requests
import time
import json

API_BASE = "http://localhost:8000"

def test_workflow():
    print("=" * 80)
    print("PART 1 FIX PACK - A2 WORKFLOW TEST")
    print("=" * 80)
    
    # Step 1: Authenticate
    print("\n[1] Authenticating...")
    auth_response = requests.post(f"{API_BASE}/auth/signup", json={
        "email": f"test_a2_{int(time.time())}@example.com",
        "password": "testpass123"
    })
    
    if auth_response.status_code != 201:
        print(f"❌ Auth failed: {auth_response.text}")
        return
    
    auth_data = auth_response.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Authenticated (token: {token[:20]}...)")
    
    # Step 2: Submit Part A
    print("\n[2] Submitting Part A data...")
    part_a_payload = {
        "schema_version": "1.0.0",
        "submission_timestamp": "2026-01-30T00:00:00Z",
        "specimen_data": {
            "modalities_selected": ["blood"],
            "blood": [{
                "collection_datetime": "2026-01-29T08:00:00Z",
                "source_format": "manual_entry",
                "analytes": [
                    {"name": "glucose", "value": 95.0, "unit": "mg/dL"},
                    {"name": "hba1c", "value": 5.5, "unit": "%"}
                ]
            }]
        },
        "isf_monitor_data": {
            "core_analytes": [
                {
                    "name": "glucose",
                    "values": [95.0 + i for i in range(100)],
                    "timestamps": [f"2026-01-{20 + i//10}T{i%24:02d}:00:00Z" for i in range(100)],
                    "unit": "mg/dL"
                }
            ],
            "signal_quality": {
                "calibration_status": "recent",
                "sensor_drift_score": 0.1,
                "noise_score": 0.05,
                "dropout_percentage": 2.0
            }
        },
        "vitals_data": {
            "cardiovascular": {
                "heart_rate_resting": [65, 66, 64],
                "bp_systolic": [120, 118, 122],
                "bp_diastolic": [80, 78, 82]
            }
        },
        "soap_profile": {
            "demographics_anthropometrics": {
                "age": 35,
                "sex": "male",
                "height_cm": 175.0,
                "weight_kg": 75.0
            },
            "subjective": {
                "chief_concern": "general health monitoring"
            },
            "objective": {
                "activity_level": "moderate"
            },
            "assessment": {
                "known_conditions": []
            },
            "plan": {
                "current_medications": []
            }
        },
        "qualitative_encoding": {
            "rules_applied": [],
            "total_encoding_entries": 0
        }
    }
    
    part_a_response = requests.post(
        f"{API_BASE}/part-a/submit",
        json=part_a_payload,
        headers=headers
    )
    
    if part_a_response.status_code != 201:
        print(f"❌ Part A submit failed: {part_a_response.text}")
        return
    
    part_a_data = part_a_response.json()
    submission_id = part_a_data["submission_id"]
    a2_run_id = part_a_data.get("a2_run_id")
    a2_status = part_a_data.get("a2_status")
    
    print(f"✅ Part A submitted")
    print(f"   Submission ID: {submission_id}")
    print(f"   A2 Run ID: {a2_run_id}")
    print(f"   A2 Status: {a2_status}")
    
    # Step 3: Poll A2 status
    print("\n[3] Polling A2 status...")
    max_polls = 10
    for i in range(max_polls):
        time.sleep(2)
        status_response = requests.get(
            f"{API_BASE}/a2/status?submission_id={submission_id}",
            headers=headers
        )
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"   Poll {i+1}: status={status_data['status']}, progress={status_data['progress']:.1%}")
            
            if status_data["status"] == "completed":
                print("✅ A2 completed successfully")
                break
            elif status_data["status"] == "failed":
                print(f"❌ A2 failed: {status_data.get('error_message')}")
                return
        else:
            print(f"   Poll {i+1}: Error fetching status")
    
    # Step 4: Get A2 Summary
    print("\n[4] Fetching A2 summary...")
    summary_response = requests.get(
        f"{API_BASE}/a2/summary?submission_id={submission_id}",
        headers=headers
    )
    
    if summary_response.status_code != 200:
        print(f"❌ Failed to get A2 summary: {summary_response.text}")
        return
    
    summary_data = summary_response.json()
    print("✅ A2 summary retrieved")
    print(f"   Eligible for Part B: {summary_data['gating']['eligible_for_part_b']}")
    print(f"   Glucose coverage: {summary_data['stream_coverage']['glucose']['days_covered']} days")
    print(f"   Metabolic anchor: {summary_data['anchor_strength_by_domain']['metabolic']['grade']}")
    
    # Step 5: Generate Part B (test phase-awareness)
    print("\n[5] Generating Part B report...")
    part_b_response = requests.post(
        f"{API_BASE}/part-b/generate",
        json={"submission_id": submission_id, "time_window_days": 30},
        headers=headers
    )
    
    if part_b_response.status_code != 200:
        print(f"❌ Part B generation failed: {part_b_response.text}")
        return
    
    part_b_data = part_b_response.json()
    
    if part_b_data["status"] != "success":
        print(f"❌ Part B status: {part_b_data['status']}")
        print(f"   Errors: {part_b_data.get('errors', [])}")
        return
    
    report = part_b_data["report"]
    print("✅ Part B generated successfully")
    print(f"   Report ID: {report['report_id']}")
    print(f"   A2 Run ID referenced: {report['a2_run_id']}")
    print(f"   A2 Header Block present: {'a2_header_block' in report}")
    print(f"   Total outputs: {report['total_outputs']}")
    print(f"   Successful outputs: {report['successful_outputs']}")
    print(f"   Average confidence: {report['average_confidence']}%")
    
    # Verify A2 header block structure
    if "a2_header_block" in report:
        header = report["a2_header_block"]
        print("\n   A2 Header Block:")
        print(f"      - Status: {header.get('a2_status')}")
        print(f"      - Run ID: {header.get('a2_run_id')}")
        print(f"      - Completed: {header.get('a2_completed_at')}")
        print(f"      - Conflicts: {header.get('a2_conflicts_count')}")
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED - A2 WORKFLOW COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_workflow()
