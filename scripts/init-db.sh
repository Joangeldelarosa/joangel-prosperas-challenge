#!/bin/bash
# Initialize DynamoDB tables (for use outside Docker)
set -euo pipefail

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_REGION:-us-east-1}"

echo "Creating DynamoDB tables at $ENDPOINT..."

aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --table-name jobs \
  --attribute-definitions \
    AttributeName=job_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema AttributeName=job_id,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"user_id-index","KeySchema":[{"AttributeName":"user_id","KeyType":"HASH"},{"AttributeName":"created_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null || echo "Table 'jobs' already exists"

aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --table-name users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=username,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"username-index","KeySchema":[{"AttributeName":"username","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null || echo "Table 'users' already exists"

echo "DynamoDB tables ready."
