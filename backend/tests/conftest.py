"""Shared test fixtures for backend tests."""

import os
import uuid

import boto3
import pytest
from moto import mock_aws

# Set test environment variables BEFORE importing app modules
os.environ["APP_ENV"] = "testing"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_ENDPOINT_URL"] = ""
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["SQS_QUEUE_NAME"] = "report-jobs"
os.environ["SQS_DLQ_NAME"] = "report-jobs-dlq"
os.environ["DYNAMODB_JOBS_TABLE"] = "jobs"
os.environ["DYNAMODB_USERS_TABLE"] = "users"
os.environ["S3_BUCKET_NAME"] = "report-results"
os.environ["FRONTEND_URL"] = "http://localhost:3000"


@pytest.fixture(autouse=True)
def aws_mock():
    """Mock all AWS services for every test."""
    with mock_aws():
        _setup_dynamodb()
        _setup_sqs()
        _setup_s3()
        # Reset module-level singletons so they pick up mocked clients
        _reset_services()
        yield


def _setup_dynamodb():
    client = boto3.client("dynamodb", region_name="us-east-1")
    # Jobs table
    client.create_table(
        TableName="jobs",
        KeySchema=[{"AttributeName": "job_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "job_id", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "user_id-index",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    # Users table
    client.create_table(
        TableName="users",
        KeySchema=[{"AttributeName": "user_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "username", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "username-index",
                "KeySchema": [
                    {"AttributeName": "username", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _setup_sqs():
    client = boto3.client("sqs", region_name="us-east-1")
    # Create DLQ first
    dlq_response = client.create_queue(QueueName="report-jobs-dlq")
    dlq_arn = client.get_queue_attributes(
        QueueUrl=dlq_response["QueueUrl"],
        AttributeNames=["QueueArn"],
    )["Attributes"]["QueueArn"]
    # Main queue with redrive policy
    import json

    client.create_queue(
        QueueName="report-jobs",
        Attributes={
            "RedrivePolicy": json.dumps(
                {"deadLetterTargetArn": dlq_arn, "maxReceiveCount": "3"}
            ),
        },
    )


def _setup_s3():
    client = boto3.client("s3", region_name="us-east-1")
    client.create_bucket(Bucket="report-results")


def _reset_services():
    """Reset singleton service instances so they use mocked AWS."""
    from app.services.job_service import JobService
    from app.services.queue_service import QueueService
    from app.services.user_service import UserService

    import app.services.job_service as js_mod
    import app.services.queue_service as qs_mod
    import app.services.user_service as us_mod

    js_mod.job_service = JobService()
    qs_mod.queue_service = QueueService()
    us_mod.user_service = UserService()


@pytest.fixture
def test_user_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def auth_token(test_user_id: str) -> str:
    """Generate a valid JWT for testing."""
    from app.core.security import create_access_token

    return create_access_token(test_user_id)


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """HTTP headers with valid Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def registered_user():
    """Create a user in the mocked DynamoDB and return credentials + user_id."""
    from app.services.user_service import user_service

    username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "securepass123"
    user = user_service.register(username, password)
    return {"user_id": user.user_id, "username": username, "password": password}
