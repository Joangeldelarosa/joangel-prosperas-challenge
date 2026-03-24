"""Unit tests for business services (job_service, queue_service, user_service)."""

import uuid

from app.services.job_service import job_service
from app.services.queue_service import queue_service
from app.services.user_service import user_service
from app.core.exceptions import NotFoundError, ConflictError, UnauthorizedError

import pytest


class TestJobService:
    def test_create_job(self, test_user_id):
        job = job_service.create_job(
            user_id=test_user_id,
            report_type="engagement_analytics",
            parameters={"format": "pdf"},
        )
        assert job.status == "PENDING"
        assert job.user_id == test_user_id
        assert job.report_type == "engagement_analytics"
        assert job.job_id  # not empty

    def test_get_job(self, test_user_id):
        job = job_service.create_job(
            user_id=test_user_id,
            report_type="revenue_breakdown",
            parameters={"format": "csv"},
        )
        retrieved = job_service.get_job(job_id=job.job_id, user_id=test_user_id)
        assert retrieved.job_id == job.job_id
        assert retrieved.report_type == "revenue_breakdown"

    def test_get_job_not_found(self, test_user_id):
        with pytest.raises(NotFoundError):
            job_service.get_job(job_id="nonexistent", user_id=test_user_id)

    def test_get_job_wrong_user(self, test_user_id):
        job = job_service.create_job(
            user_id=test_user_id,
            report_type="engagement_analytics",
            parameters={},
        )
        with pytest.raises(NotFoundError):
            job_service.get_job(job_id=job.job_id, user_id="other-user")

    def test_list_jobs_empty(self, test_user_id):
        result = job_service.list_jobs(user_id=test_user_id)
        assert result["total"] == 0
        assert result["jobs"] == []
        assert result["has_next"] is False

    def test_list_jobs_with_items(self, test_user_id):
        for i in range(3):
            job_service.create_job(
                user_id=test_user_id,
                report_type="growth_summary",
                parameters={"index": i},
            )
        result = job_service.list_jobs(user_id=test_user_id)
        assert result["total"] == 3
        assert len(result["jobs"]) == 3

    def test_list_jobs_pagination(self, test_user_id):
        for i in range(5):
            job_service.create_job(
                user_id=test_user_id,
                report_type="engagement_analytics",
                parameters={"i": i},
            )
        result = job_service.list_jobs(user_id=test_user_id, page=1, per_page=2)
        assert result["total"] == 5
        assert len(result["jobs"]) == 2
        assert result["has_next"] is True

        result2 = job_service.list_jobs(user_id=test_user_id, page=3, per_page=2)
        assert len(result2["jobs"]) == 1
        assert result2["has_next"] is False

    def test_update_job_status(self, test_user_id):
        job = job_service.create_job(
            user_id=test_user_id,
            report_type="engagement_analytics",
            parameters={},
        )
        job_service.update_job_status(job.job_id, "PROCESSING")
        updated = job_service.get_job(job.job_id, test_user_id)
        assert updated.status == "PROCESSING"

    def test_update_job_status_with_result_url(self, test_user_id):
        job = job_service.create_job(
            user_id=test_user_id,
            report_type="engagement_analytics",
            parameters={},
        )
        job_service.update_job_status(
            job.job_id, "COMPLETED", result_url="https://s3.example.com/report.json"
        )
        updated = job_service.get_job(job.job_id, test_user_id)
        assert updated.status == "COMPLETED"
        assert updated.result_url == "https://s3.example.com/report.json"


class TestQueueService:
    def test_publish_job(self, test_user_id):
        """Publishing a job should not raise — message goes to SQS."""
        queue_service.publish_job(
            job_id=str(uuid.uuid4()),
            user_id=test_user_id,
            report_type="engagement_analytics",
            parameters={"format": "pdf"},
        )

    def test_queue_url_resolved(self):
        """Queue URL should be resolved from SQS."""
        url = queue_service.queue_url
        assert "report-jobs" in url


class TestUserService:
    def test_register_user(self):
        user = user_service.register("newuser", "securepass123")
        assert user.username == "newuser"
        assert user.user_id

    def test_register_duplicate_username(self):
        user_service.register("dupeuser", "securepass123")
        with pytest.raises(ConflictError):
            user_service.register("dupeuser", "anotherpass123")

    def test_authenticate_success(self):
        user_service.register("authuser", "mypassword123")
        user = user_service.authenticate("authuser", "mypassword123")
        assert user.username == "authuser"

    def test_authenticate_wrong_password(self):
        user_service.register("wrongpw", "correctpass123")
        with pytest.raises(UnauthorizedError):
            user_service.authenticate("wrongpw", "wrongpass123")

    def test_authenticate_nonexistent_user(self):
        with pytest.raises(UnauthorizedError):
            user_service.authenticate("nobody", "somepass123")
