import boto3
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.core.exceptions import NotFoundError
from app.core.security import get_current_user
from app.models.schemas import CreateJobRequest, CreateJobResponse, JobListResponse, JobResponse
from app.services.job_service import job_service
from app.services.queue_service import queue_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=CreateJobResponse, status_code=status.HTTP_201_CREATED)
def create_job(request: CreateJobRequest, user_id: str = Depends(get_current_user)):
    parameters = {
        "date_range": {
            "start": request.date_range.start.isoformat(),
            "end": request.date_range.end.isoformat(),
        },
        "format": request.format,
    }
    job = job_service.create_job(
        user_id=user_id,
        report_type=request.report_type,
        parameters=parameters,
    )
    # Publish to SQS for async processing (fire-and-forget for the API)
    queue_service.publish_job(
        job_id=job.job_id,
        user_id=user_id,
        report_type=job.report_type,
        parameters=parameters,
    )
    return CreateJobResponse(job_id=job.job_id, status=job.status)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, user_id: str = Depends(get_current_user)):
    job = job_service.get_job(job_id=job_id, user_id=user_id)
    return JobResponse(
        job_id=job.job_id,
        user_id=job.user_id,
        status=job.status,
        report_type=job.report_type,
        parameters=job.parameters,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result_url=job.result_url,
    )


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    result = job_service.list_jobs(user_id=user_id, page=page, per_page=per_page)
    jobs = [
        JobResponse(
            job_id=j.job_id,
            user_id=j.user_id,
            status=j.status,
            report_type=j.report_type,
            parameters=j.parameters,
            created_at=j.created_at,
            updated_at=j.updated_at,
            result_url=j.result_url,
        )
        for j in result["jobs"]
    ]
    return JobListResponse(
        jobs=jobs,
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        has_next=result["has_next"],
    )


@router.get("/{job_id}/download")
def download_job_result(
    job_id: str,
    token: str = Query(..., description="JWT token for authentication"),
):
    """Generate a presigned S3 URL and redirect to it for downloading the report."""
    from app.core.security import decode_access_token

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Invalid token")

    job = job_service.get_job(job_id=job_id, user_id=user_id)
    if job.status != "COMPLETED" or not job.result_url:
        raise NotFoundError("Report not available for download")

    s3_client = boto3.client("s3", **_get_client_kwargs())

    # Generate presigned URL with browser-accessible endpoint
    client_kwargs = {"Bucket": settings.s3_bucket_name, "Key": job.result_url}
    presigned_url = s3_client.generate_presigned_url(
        "get_object", Params=client_kwargs, ExpiresIn=3600
    )

    # In local dev, replace internal Docker hostname with localhost
    if settings.is_local and presigned_url:
        presigned_url = presigned_url.replace(
            "http://localstack:", "http://localhost:"
        )

    return RedirectResponse(url=presigned_url)
