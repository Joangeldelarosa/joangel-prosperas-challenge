"""Health check endpoint for dependency monitoring."""

import logging
from datetime import UTC, datetime

import boto3
from fastapi import APIRouter

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.models.schemas import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


def _check_dynamodb() -> str:
    try:
        client = boto3.client("dynamodb", **_get_client_kwargs())
        client.describe_table(TableName=settings.dynamodb_jobs_table)
        return "healthy"
    except Exception as e:
        logger.warning("DynamoDB health check failed: %s", e)
        return "unhealthy"


def _check_sqs() -> str:
    try:
        client = boto3.client("sqs", **_get_client_kwargs())
        client.get_queue_url(QueueName=settings.sqs_queue_name)
        return "healthy"
    except Exception as e:
        logger.warning("SQS health check failed: %s", e)
        return "unhealthy"


def _check_s3() -> str:
    try:
        client = boto3.client("s3", **_get_client_kwargs())
        client.head_bucket(Bucket=settings.s3_bucket_name)
        return "healthy"
    except Exception as e:
        logger.warning("S3 health check failed: %s", e)
        return "unhealthy"


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Check the health of all system dependencies."""
    dependencies = {
        "dynamodb": _check_dynamodb(),
        "sqs": _check_sqs(),
        "s3": _check_s3(),
    }
    overall = "healthy" if all(v == "healthy" for v in dependencies.values()) else "degraded"
    return HealthResponse(
        status=overall,
        dependencies=dependencies,
        timestamp=datetime.now(UTC).isoformat(),
    )
