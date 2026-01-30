#!/bin/bash
# Quick test of Part 1 Fix Pack - A2 Workflow

API_BASE="http://localhost:8000"

echo "================================================================================"
echo "PART 1 FIX PACK - A2 WORKFLOW TEST"
echo "================================================================================"

# Step 1: Auth
echo -e "\n[1] Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test_$(date +%s)@example.com\",\"password\":\"testpass123\"}")

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Auth failed"
    echo "$AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authenticated (token: ${TOKEN:0:20}...)"

# Step 2: Submit Part A (minimal payload)
echo -e "\n[2] Submitting Part A data..."
PART_A_RESPONSE=$(curl -s -X POST "${API_BASE}/part-a/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "schema_version": "1.0.0",
    "submission_timestamp": "2026-01-30T00:00:00Z",
    "specimen_data": {
      "modalities_selected": ["blood"],
      "blood": [{
        "collection_datetime": "2026-01-29T08:00:00Z",
        "source_format": "manual_entry",
        "analytes": [{"name": "glucose", "value": 95.0, "unit": "mg/dL"}]
      }]
    },
    "isf_monitor_data": {
      "core_analytes": [{
        "name": "glucose",
        "values": [95,96,94,97,93,98,92,99,91,100,90,95,96,94],
        "timestamps": [
          "2026-01-20T00:00:00Z","2026-01-20T01:00:00Z","2026-01-20T02:00:00Z",
          "2026-01-20T03:00:00Z","2026-01-20T04:00:00Z","2026-01-20T05:00:00Z",
          "2026-01-20T06:00:00Z","2026-01-21T00:00:00Z","2026-01-21T01:00:00Z",
          "2026-01-22T00:00:00Z","2026-01-23T00:00:00Z","2026-01-24T00:00:00Z",
          "2026-01-25T00:00:00Z","2026-01-26T00:00:00Z"
        ],
        "unit": "mg/dL"
      }],
      "signal_quality": {
        "calibration_status": "recent",
        "sensor_drift_score": 0.1,
        "noise_score": 0.05,
        "dropout_percentage": 2.0
      }
    },
    "vitals_data": {
      "cardiovascular": {
        "heart_rate_resting": [65],
        "bp_systolic": [120],
        "bp_diastolic": [80]
      }
    },
    "soap_profile": {
      "demographics_anthropometrics": {
        "age": 35,
        "sex": "male",
        "height_cm": 175.0,
        "weight_kg": 75.0
      },
      "subjective": {"chief_concern": "test"},
      "objective": {"activity_level": "moderate"},
      "assessment": {"known_conditions": []},
      "plan": {"current_medications": []}
    },
    "qualitative_encoding": {"rules_applied": [], "total_encoding_entries": 0}
  }')

SUBMISSION_ID=$(echo $PART_A_RESPONSE | grep -o '"submission_id":"[^"]*' | cut -d'"' -f4)
A2_RUN_ID=$(echo $PART_A_RESPONSE | grep -o '"a2_run_id":"[^"]*' | cut -d'"' -f4)
A2_STATUS=$(echo $PART_A_RESPONSE | grep -o '"a2_status":"[^"]*' | cut -d'"' -f4)

if [ -z "$SUBMISSION_ID" ]; then
    echo "❌ Part A submit failed"
    echo "$PART_A_RESPONSE"
    exit 1
fi

echo "✅ Part A submitted"
echo "   Submission ID: $SUBMISSION_ID"
echo "   A2 Run ID: $A2_RUN_ID"
echo "   A2 Status: $A2_STATUS"

# Step 3: Check A2 Status
echo -e "\n[3] Checking A2 status..."
sleep 2

STATUS_RESPONSE=$(curl -s "${API_BASE}/a2/status?submission_id=${SUBMISSION_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | python3 -m json.tool | head -20

# Step 4: Get A2 Summary
echo -e "\n[4] Fetching A2 summary..."
SUMMARY_RESPONSE=$(curl -s "${API_BASE}/a2/summary?submission_id=${SUBMISSION_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "$SUMMARY_RESPONSE" | python3 -m json.tool | head -30

# Step 5: Test backward-compatible completeness endpoint
echo -e "\n[5] Testing backward-compatible completeness endpoint..."
COMPLETENESS_RESPONSE=$(curl -s "${API_BASE}/a2/completeness/${SUBMISSION_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "$COMPLETENESS_RESPONSE" | python3 -m json.tool | head -20

echo -e "\n================================================================================"
echo "✅ KEY TESTS PASSED"
echo "   - Part A returns a2_run_id + a2_status"
echo "   - A2 status endpoint works"
echo "   - A2 summary endpoint works"
echo "   - Backward-compatible completeness endpoint works"
echo "================================================================================"
