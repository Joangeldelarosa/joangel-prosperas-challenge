import json
import logging
import random
import time
import uuid
from datetime import UTC, datetime

import boto3

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.services.job_service import job_service

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client("s3", **_get_client_kwargs())


def _generate_report_data(report_type: str, parameters: dict) -> dict:
    """Generate dummy report data simulating real analytics output."""
    return {
        "report_type": report_type,
        "parameters": parameters,
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "total_records": random.randint(100, 50_000),
            "unique_users": random.randint(10, 5_000),
            "avg_session_duration_seconds": round(random.uniform(30, 600), 2),
            "conversion_rate": round(random.uniform(0.01, 0.25), 4),
            "revenue_total": round(random.uniform(1_000, 500_000), 2),
        },
        "breakdown": [
            {
                "category": f"category_{i}",
                "count": random.randint(10, 1_000),
                "percentage": round(random.uniform(0.05, 0.30), 4),
            }
            for i in range(1, random.randint(4, 8))
        ],
    }


def process_job(
    job_id: str, user_id: str, report_type: str, parameters: dict
) -> None:
    """Process a single report job: simulate work, upload result to S3, update status."""
    logger.info("Starting processing", extra={"job_id": job_id})

    job_service.update_job_status(job_id, "PROCESSING")

    try:
        # Simulate CPU-bound processing
        sleep_seconds = random.randint(5, 30)
        logger.info(
            "Simulating processing for %d seconds",
            sleep_seconds,
            extra={"job_id": job_id},
        )
        time.sleep(sleep_seconds)

        # Generate dummy report
        report_data = _generate_report_data(report_type, parameters)
        report_json = json.dumps(report_data, indent=2)

        # Upload to S3
        s3 = _get_s3_client()
        s3_key = f"reports/{user_id}/{job_id}/{uuid.uuid4()}.json"
        s3.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=report_json.encode("utf-8"),
            ContentType="application/json",
        )

        if settings.aws_endpoint_url:
            result_url = f"{settings.aws_endpoint_url}/{settings.s3_bucket_name}/{s3_key}"
        else:
            result_url = f"https://{settings.s3_bucket_name}.s3.amazonaws.com/{s3_key}"

        job_service.update_job_status(job_id, "COMPLETED", result_url=result_url)
        logger.info("Job completed", extra={"job_id": job_id, "result_url": result_url})

    except Exception:
        logger.exception("Job processing failed", extra={"job_id": job_id})
        job_service.update_job_status(job_id, "FAILED")
        raise
