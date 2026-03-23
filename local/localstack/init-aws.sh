#!/bin/bash
# LocalStack initialization script
# Creates all required AWS resources for local development
set -euo pipefail

echo "============================================"
echo " Initializing AWS resources in LocalStack"
echo "============================================"

REGION="us-east-1"
ENDPOINT="http://localhost.localstack.cloud:4566"

# --- SQS ---
echo "[SQS] Creating Dead Letter Queue..."
awslocal sqs create-queue \
  --queue-name report-jobs-dlq \
  --region "$REGION"

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$ENDPOINT/000000000000/report-jobs-dlq" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query 'Attributes.QueueArn' \
  --output text)

echo "[SQS] Creating main queue with redrive policy..."
awslocal sqs create-queue \
  --queue-name report-jobs \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --region "$REGION"

echo "[SQS] Queues created:"
awslocal sqs list-queues --region "$REGION"

# --- DynamoDB ---
echo "[DynamoDB] Creating jobs table..."
awslocal dynamodb create-table \
  --table-name jobs \
  --attribute-definitions \
    AttributeName=job_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema \
    AttributeName=job_id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "user_id-index",
      "KeySchema": [
        {"AttributeName": "user_id", "KeyType": "HASH"},
        {"AttributeName": "created_at", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "[DynamoDB] Creating users table..."
awslocal dynamodb create-table \
  --table-name users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=username,AttributeType=S \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "username-index",
      "KeySchema": [
        {"AttributeName": "username", "KeyType": "HASH"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "[DynamoDB] Tables created:"
awslocal dynamodb list-tables --region "$REGION"

# --- S3 ---
echo "[S3] Creating report-results bucket..."
awslocal s3 mb s3://report-results --region "$REGION"

echo "[S3] Buckets created:"
awslocal s3 ls

echo "============================================"
echo " LocalStack initialization complete!"
echo "============================================"
