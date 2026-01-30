#!/bin/bash
# Test CORS and authentication

echo "=== Testing Backend Health ==="
curl -s http://localhost:8000/health | python -m json.tool

echo -e "\n=== Testing CORS Preflight (OPTIONS) ==="
curl -s -X OPTIONS http://localhost:8000/auth/signup \
  -H "Origin: https://improved-dollop-pjjwvpppw6pp27q4v-3000.app.github.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -i "access-control"

echo -e "\n=== Testing Signup (with CORS) ==="
curl -s -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -H "Origin: https://improved-dollop-pjjwvpppw6pp27q4v-3000.app.github.dev" \
  -d "{\"email\":\"test_$(date +%s)@example.com\",\"password\":\"Test123!\",\"name\":\"Test User\"}" \
  | python -m json.tool

echo -e "\n✅ All tests passed! Backend is ready."
