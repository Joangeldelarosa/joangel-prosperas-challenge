"""Unit tests for worker processor logic."""

import json
from unittest.mock import patch, MagicMock

from app.worker.processor import _generate_report_data, process_job


class TestGenerateReportData:
    def test_returns_dict_with_expected_keys(self):
        result = _generate_report_data("engagement_analytics", {"format": "pdf"})
        assert "report_type" in result
        assert "parameters" in result
        assert "generated_at" in result
        assert "summary" in result
        assert "breakdown" in result

    def test_summary_has_expected_fields(self):
        result = _generate_report_data("revenue_breakdown", {})
        summary = result["summary"]
        assert "total_records" in summary
        assert "unique_users" in summary
        assert "avg_session_duration_seconds" in summary
        assert "conversion_rate" in summary
        assert "revenue_total" in summary

    def test_breakdown_is_list(self):
        result = _generate_report_data("growth_summary", {})
        assert isinstance(result["breakdown"], list)
        assert len(result["breakdown"]) >= 3

    def test_report_type_matches_input(self):
        rt = "engagement_analytics"
        result = _generate_report_data(rt, {"format": "csv"})
        assert result["report_type"] == rt


class TestProcessJob:
    @patch("app.worker.processor.time.sleep")
    @patch("app.worker.processor._get_s3_client")
    @patch("app.worker.processor.job_service")
    def test_successful_processing(self, mock_job_svc, mock_s3_factory, mock_sleep):
        mock_s3 = MagicMock()
        mock_s3_factory.return_value = mock_s3

        process_job("job-123", "user-456", "engagement_analytics", {"format": "pdf"})

        # Status should go to PROCESSING then COMPLETED
        calls = mock_job_svc.update_job_status.call_args_list
        assert len(calls) == 2
        assert calls[0].args == ("job-123", "PROCESSING")
        assert calls[1].args[0] == "job-123"
        assert calls[1].args[1] == "COMPLETED"

        # S3 upload should have been called
        mock_s3.put_object.assert_called_once()

    @patch("app.worker.processor.time.sleep")
    @patch("app.worker.processor._get_s3_client")
    @patch("app.worker.processor.job_service")
    def test_failed_processing_updates_status(self, mock_job_svc, mock_s3_factory, mock_sleep):
        mock_s3 = MagicMock()
        mock_s3.put_object.side_effect = Exception("S3 error")
        mock_s3_factory.return_value = mock_s3

        with __import__("pytest").raises(Exception, match="S3 error"):
            process_job("job-fail", "user-456", "revenue_breakdown", {})

        calls = mock_job_svc.update_job_status.call_args_list
        assert calls[0].args == ("job-fail", "PROCESSING")
        assert calls[1].args == ("job-fail", "FAILED")


class TestFailingReport:
    @patch("app.worker.processor.job_service")
    def test_failing_report_raises_error(self, mock_job_svc):
        """Circuit breaker demonstration: failing_report always fails."""
        import pytest
        with pytest.raises(RuntimeError, match="Deliberate failure"):
            process_job("job-fail-cb", "user-1", "failing_report", {})

        calls = mock_job_svc.update_job_status.call_args_list
        assert calls[0].args == ("job-fail-cb", "PROCESSING")
        assert calls[1].args == ("job-fail-cb", "FAILED")


class TestBackoffCalculation:
    def test_first_attempt_delay(self):
        from app.core.config import settings
        delay = min(settings.retry_base_delay * (2 ** (1 - 1)), settings.retry_max_delay)
        assert delay == 10

    def test_second_attempt_delay(self):
        from app.core.config import settings
        delay = min(settings.retry_base_delay * (2 ** (2 - 1)), settings.retry_max_delay)
        assert delay == 20

    def test_third_attempt_delay(self):
        from app.core.config import settings
        delay = min(settings.retry_base_delay * (2 ** (3 - 1)), settings.retry_max_delay)
        assert delay == 40

    def test_delay_caps_at_max(self):
        from app.core.config import settings
        delay = min(settings.retry_base_delay * (2 ** (10 - 1)), settings.retry_max_delay)
        assert delay == settings.retry_max_delay
