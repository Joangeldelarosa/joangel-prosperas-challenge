"""Integration tests for API endpoints using FastAPI TestClient."""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


class TestAuthEndpoints:
    def test_register_success(self):
        username = f"user_{uuid.uuid4().hex[:8]}"
        response = client.post(
            "/api/auth/register",
            json={"username": username, "password": "testpass123"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "user_id" in data
        assert "token" in data

    def test_register_duplicate(self):
        username = f"dupe_{uuid.uuid4().hex[:8]}"
        client.post(
            "/api/auth/register",
            json={"username": username, "password": "testpass123"},
        )
        response = client.post(
            "/api/auth/register",
            json={"username": username, "password": "testpass123"},
        )
        assert response.status_code == 409

    def test_register_invalid_short_password(self):
        response = client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "12345"},
        )
        assert response.status_code == 422

    def test_login_success(self, registered_user):
        response = client.post(
            "/api/auth/login",
            json={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        assert "token" in response.json()

    def test_login_wrong_password(self, registered_user):
        response = client.post(
            "/api/auth/login",
            json={
                "username": registered_user["username"],
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        response = client.post(
            "/api/auth/login",
            json={"username": "nobody", "password": "testpass123"},
        )
        assert response.status_code == 401


class TestJobEndpoints:
    def test_create_job(self, auth_headers):
        response = client.post(
            "/api/jobs",
            json={
                "report_type": "engagement_analytics",
                "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
                "format": "pdf",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "PENDING"
        assert "job_id" in data

    def test_create_job_invalid_type(self, auth_headers):
        response = client.post(
            "/api/jobs",
            json={
                "report_type": "invalid",
                "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
                "format": "pdf",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_job_no_auth(self):
        response = client.post(
            "/api/jobs",
            json={
                "report_type": "engagement_analytics",
                "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
                "format": "pdf",
            },
        )
        assert response.status_code == 403  # no Bearer header

    def test_get_job(self, auth_headers):
        create_resp = client.post(
            "/api/jobs",
            json={
                "report_type": "revenue_breakdown",
                "date_range": {"start": "2025-01-01", "end": "2025-06-30"},
                "format": "csv",
            },
            headers=auth_headers,
        )
        job_id = create_resp.json()["job_id"]

        response = client.get(f"/api/jobs/{job_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == job_id
        assert data["status"] == "PENDING"
        assert data["report_type"] == "revenue_breakdown"

    def test_get_job_not_found(self, auth_headers):
        response = client.get(f"/api/jobs/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_list_jobs(self, auth_headers):
        # Create 3 jobs
        for rt in ["engagement_analytics", "revenue_breakdown", "growth_summary"]:
            client.post(
                "/api/jobs",
                json={
                    "report_type": rt,
                    "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
                    "format": "json",
                },
                headers=auth_headers,
            )

        response = client.get("/api/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["jobs"]) == 3
        assert data["page"] == 1

    def test_list_jobs_pagination(self, auth_headers):
        for i in range(5):
            client.post(
                "/api/jobs",
                json={
                    "report_type": "engagement_analytics",
                    "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
                    "format": "pdf",
                },
                headers=auth_headers,
            )

        response = client.get("/api/jobs?page=1&per_page=2", headers=auth_headers)
        data = response.json()
        assert data["total"] == 5
        assert len(data["jobs"]) == 2
        assert data["has_next"] is True

    def test_list_jobs_empty(self, auth_headers):
        response = client.get("/api/jobs", headers=auth_headers)
        data = response.json()
        assert data["total"] == 0
        assert data["jobs"] == []
