"""Unit tests for Pydantic schemas and data models."""

import pytest
from pydantic import ValidationError

from app.models.schemas import AuthRequest, CreateJobRequest, DateRange, JobResponse
from app.models.job import Job
from app.models.user import User


class TestAuthRequest:
    def test_valid_auth_request(self):
        req = AuthRequest(username="testuser", password="securepass")
        assert req.username == "testuser"
        assert req.password == "securepass"

    def test_username_too_short(self):
        with pytest.raises(ValidationError):
            AuthRequest(username="ab", password="securepass")

    def test_password_too_short(self):
        with pytest.raises(ValidationError):
            AuthRequest(username="testuser", password="12345")


class TestCreateJobRequest:
    def test_valid_job_request(self):
        req = CreateJobRequest(
            report_type="engagement_analytics",
            date_range=DateRange(start="2025-01-01", end="2025-12-31"),
            format="pdf",
        )
        assert req.report_type == "engagement_analytics"
        assert req.format == "pdf"

    def test_invalid_report_type(self):
        with pytest.raises(ValidationError):
            CreateJobRequest(
                report_type="invalid_type",
                date_range=DateRange(start="2025-01-01", end="2025-12-31"),
                format="pdf",
            )

    def test_invalid_format(self):
        with pytest.raises(ValidationError):
            CreateJobRequest(
                report_type="engagement_analytics",
                date_range=DateRange(start="2025-01-01", end="2025-12-31"),
                format="xml",
            )

    def test_all_valid_report_types(self):
        for rt in ["engagement_analytics", "revenue_breakdown", "growth_summary"]:
            req = CreateJobRequest(
                report_type=rt,
                date_range=DateRange(start="2025-01-01", end="2025-12-31"),
                format="csv",
            )
            assert req.report_type == rt

    def test_all_valid_formats(self):
        for fmt in ["pdf", "csv", "json"]:
            req = CreateJobRequest(
                report_type="engagement_analytics",
                date_range=DateRange(start="2025-01-01", end="2025-12-31"),
                format=fmt,
            )
            assert req.format == fmt


class TestJobModel:
    def test_job_to_dict_and_back(self):
        job = Job(
            job_id="test-123",
            user_id="user-456",
            status="PENDING",
            report_type="engagement_analytics",
            parameters={"format": "pdf"},
        )
        data = job.to_dict()
        assert data["job_id"] == "test-123"
        assert data["status"] == "PENDING"
        assert "result_url" not in data  # None excluded

        restored = Job.from_dict(data)
        assert restored.job_id == job.job_id
        assert restored.status == job.status

    def test_job_with_result_url(self):
        job = Job(
            job_id="test-123",
            user_id="user-456",
            status="COMPLETED",
            report_type="revenue_breakdown",
            parameters={},
            result_url="https://s3.example.com/report.json",
        )
        data = job.to_dict()
        assert data["result_url"] == "https://s3.example.com/report.json"


class TestUserModel:
    def test_user_to_dict_and_back(self):
        user = User(
            user_id="user-123",
            username="testuser",
            password_hash="hashed_value",
        )
        data = user.to_dict()
        assert data["username"] == "testuser"

        restored = User.from_dict(data)
        assert restored.user_id == user.user_id
        assert restored.username == user.username


class TestJobResponse:
    def test_response_serialization(self):
        resp = JobResponse(
            job_id="id-1",
            user_id="uid-1",
            status="PENDING",
            report_type="growth_summary",
            parameters={"format": "json"},
            created_at="2025-01-01T00:00:00Z",
            updated_at="2025-01-01T00:00:00Z",
            result_url=None,
        )
        data = resp.model_dump()
        assert data["status"] == "PENDING"
        assert data["result_url"] is None
