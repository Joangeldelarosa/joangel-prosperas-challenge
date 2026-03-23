from datetime import date

from pydantic import BaseModel, Field


# === Auth Schemas ===

class AuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class AuthResponse(BaseModel):
    user_id: str
    token: str


class LoginResponse(BaseModel):
    token: str


# === Job Schemas ===

class DateRange(BaseModel):
    start: date
    end: date


class CreateJobRequest(BaseModel):
    report_type: str = Field(
        ...,
        pattern=r"^(engagement_analytics|revenue_breakdown|growth_summary)$",
        description="Type of report to generate",
    )
    date_range: DateRange
    format: str = Field(
        ...,
        pattern=r"^(pdf|csv|json)$",
        description="Output format",
    )


class CreateJobResponse(BaseModel):
    job_id: str
    status: str = "PENDING"


class JobResponse(BaseModel):
    job_id: str
    user_id: str
    status: str
    report_type: str
    parameters: dict
    created_at: str
    updated_at: str
    result_url: str | None = None


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    per_page: int
    has_next: bool


# === Health Schema ===

class HealthResponse(BaseModel):
    status: str
    dependencies: dict
    timestamp: str
