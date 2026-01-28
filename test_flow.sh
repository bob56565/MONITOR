#!/bin/bash

API="http://127.0.0.1:8000"

echo "=== 1. Signup ==="
curl -sS -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"abe+1@test.com","password":"StrongPass123!","name":"Abe"}' > signup.json

cat signup.json | python -m json.tool
TOKEN=$(python -c "import json; print(json.load(open('signup.json'))['access_token'])")
echo "Token: $TOKEN"
echo ""

echo "=== 2. Ingest Raw Data ==="
curl -sS -X POST "$API/data/raw" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2026-01-27T00:00:00Z","specimen_type":"blood","observed":{"glucose_mg_dl":128,"lactate_mmol_l":2.1},"context":{"age":30,"sex":"M","fasting":false}}' > raw.json

cat raw.json | python -m json.tool
RAW_ID=$(python -c "import json; d=json.load(open('raw.json')); print(d.get('id') or d.get('raw_id') or d.get('raw_sensor_data_id'))")
echo "Raw ID: $RAW_ID"
echo ""

echo "=== 3. Preprocess ==="
curl -sS -X POST "$API/data/preprocess" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"raw_id\":$RAW_ID}" > pre.json

cat pre.json | python -m json.tool
PRE_ID=$(python -c "import json; d=json.load(open('pre.json')); print(d.get('id') or d.get('calibrated_id') or d.get('calibrated_features_id'))")
echo "Preprocessed ID: $PRE_ID"
echo ""

echo "=== 4. Infer ==="
curl -sS -X POST "$API/ai/infer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"calibrated_id\":$PRE_ID}" > infer.json

cat infer.json | python -m json.tool
echo ""
echo "=== Final Result ==="
cat infer.json
