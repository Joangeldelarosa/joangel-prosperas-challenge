#!/bin/sh
# LocalStack initialization script
# Creates required AWS resources for local development (idempotent).
set -eu

log() {
  printf '%s\n' "$1"
}

REGION="${AWS_REGION:-us-east-1}"
ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localstack:4566}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-000000000000}"

SQS_QUEUE_NAME="${SQS_QUEUE_NAME:-report-jobs}"
SQS_DLQ_NAME="${SQS_DLQ_NAME:-report-jobs-dlq}"
SQS_HIGH_PRIORITY_QUEUE_NAME="${SQS_HIGH_PRIORITY_QUEUE_NAME:-report-jobs-high}"
SQS_HIGH_PRIORITY_DLQ_NAME="${SQS_HIGH_PRIORITY_DLQ_NAME:-report-jobs-high-dlq}"
SQS_MAX_RECEIVE_COUNT="${SQS_MAX_RECEIVE_COUNT:-3}"

DYNAMODB_JOBS_TABLE="${DYNAMODB_JOBS_TABLE:-jobs}"
DYNAMODB_USERS_TABLE="${DYNAMODB_USERS_TABLE:-users}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-report-results}"

AWS_CMD="aws --endpoint-url=${ENDPOINT_URL} --region ${REGION}"

queue_url() {
  printf '%s/%s/%s' "$ENDPOINT_URL" "$ACCOUNT_ID" "$1"
}

queue_exists() {
  $AWS_CMD sqs get-queue-url --queue-name "$1" >/dev/null 2>&1
}

table_exists() {
  $AWS_CMD dynamodb describe-table --table-name "$1" >/dev/null 2>&1
}

bucket_exists() {
  $AWS_CMD s3api head-bucket --bucket "$1" >/dev/null 2>&1
}

log "============================================"
log " Initializing AWS resources in LocalStack"
log " Endpoint: ${ENDPOINT_URL}"
log "============================================"

# --- SQS ---
if queue_exists "$SQS_DLQ_NAME"; then
  log "[SQS] Queue exists: ${SQS_DLQ_NAME}"
else
  log "[SQS] Creating queue: ${SQS_DLQ_NAME}"
  $AWS_CMD sqs create-queue --queue-name "$SQS_DLQ_NAME" >/dev/null
fi

DLQ_ARN=$($AWS_CMD sqs get-queue-attributes \
  --queue-url "$(queue_url "$SQS_DLQ_NAME")" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

if queue_exists "$SQS_QUEUE_NAME"; then
  log "[SQS] Queue exists: ${SQS_QUEUE_NAME}"
else
  log "[SQS] Creating queue: ${SQS_QUEUE_NAME}"
  $AWS_CMD sqs create-queue \
    --queue-name "$SQS_QUEUE_NAME" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"$SQS_MAX_RECEIVE_COUNT\\\"}\"}" \
    >/dev/null
fi

if queue_exists "$SQS_HIGH_PRIORITY_DLQ_NAME"; then
  log "[SQS] Queue exists: ${SQS_HIGH_PRIORITY_DLQ_NAME}"
else
  log "[SQS] Creating queue: ${SQS_HIGH_PRIORITY_DLQ_NAME}"
  $AWS_CMD sqs create-queue --queue-name "$SQS_HIGH_PRIORITY_DLQ_NAME" >/dev/null
fi

HIGH_DLQ_ARN=$($AWS_CMD sqs get-queue-attributes \
  --queue-url "$(queue_url "$SQS_HIGH_PRIORITY_DLQ_NAME")" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

if queue_exists "$SQS_HIGH_PRIORITY_QUEUE_NAME"; then
  log "[SQS] Queue exists: ${SQS_HIGH_PRIORITY_QUEUE_NAME}"
else
  log "[SQS] Creating queue: ${SQS_HIGH_PRIORITY_QUEUE_NAME}"
  $AWS_CMD sqs create-queue \
    --queue-name "$SQS_HIGH_PRIORITY_QUEUE_NAME" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$HIGH_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"$SQS_MAX_RECEIVE_COUNT\\\"}\"}" \
    >/dev/null
fi

log "[SQS] Queues ready"

# --- DynamoDB ---
if table_exists "$DYNAMODB_JOBS_TABLE"; then
  log "[DynamoDB] Table exists: ${DYNAMODB_JOBS_TABLE}"
else
  log "[DynamoDB] Creating table: ${DYNAMODB_JOBS_TABLE}"
  $AWS_CMD dynamodb create-table \
    --table-name "$DYNAMODB_JOBS_TABLE" \
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
    >/dev/null
fi

if table_exists "$DYNAMODB_USERS_TABLE"; then
  log "[DynamoDB] Table exists: ${DYNAMODB_USERS_TABLE}"
else
  log "[DynamoDB] Creating table: ${DYNAMODB_USERS_TABLE}"
  $AWS_CMD dynamodb create-table \
    --table-name "$DYNAMODB_USERS_TABLE" \
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
    >/dev/null
fi

log "[DynamoDB] Tables ready"

# --- S3 ---
if bucket_exists "$S3_BUCKET_NAME"; then
  log "[S3] Bucket exists: ${S3_BUCKET_NAME}"
else
  log "[S3] Creating bucket: ${S3_BUCKET_NAME}"
  if [ "$REGION" = "us-east-1" ]; then
    $AWS_CMD s3api create-bucket --bucket "$S3_BUCKET_NAME" >/dev/null
  else
    $AWS_CMD s3api create-bucket \
      --bucket "$S3_BUCKET_NAME" \
      --create-bucket-configuration "LocationConstraint=${REGION}" \
      >/dev/null
  fi
fi

log "[S3] Buckets ready"
log "============================================"
log " LocalStack initialization complete"
log "============================================"
