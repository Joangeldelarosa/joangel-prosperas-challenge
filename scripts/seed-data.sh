#!/bin/bash
# Seed test data into the local environment
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

echo "Seeding test data at $API_URL..."

# Register a test user
echo "Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}')

TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "User may already exist, trying login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "testpass123"}')
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
fi

echo "Token obtained. Creating sample jobs..."

# Create sample jobs
for TYPE in engagement_analytics revenue_breakdown growth_summary; do
  for FORMAT in pdf csv json; do
    curl -s -X POST "$API_URL/api/jobs" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"report_type\": \"$TYPE\", \"date_range\": {\"start\": \"2025-01-01\", \"end\": \"2025-12-31\"}, \"format\": \"$FORMAT\"}" > /dev/null
    echo "  Created $TYPE ($FORMAT)"
  done
done

echo "Seed data complete! 9 jobs created."
