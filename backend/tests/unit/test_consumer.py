"""Unit tests for SQS Consumer."""

import json
from unittest.mock import MagicMock, patch

from app.worker.consumer import Consumer


class TestConsumerHandleMessage:
    @patch("app.worker.consumer.process_job")
    def test_successful_message_deletes_from_queue(self, mock_process):
        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._queue_url = "http://queue/standard"
        consumer._high_priority_queue_url = "http://queue/high"

        message = {
            "ReceiptHandle": "receipt-123",
            "Body": json.dumps({
                "job_id": "job-1",
                "user_id": "user-1",
                "report_type": "growth_summary",
                "parameters": {},
            }),
            "Attributes": {"ApproximateReceiveCount": "1"},
            "_source_queue_url": "http://queue/standard",
        }

        consumer._handle_message(message)

        mock_process.assert_called_once_with("job-1", "user-1", "growth_summary", {})
        consumer._client.delete_message.assert_called_once_with(
            QueueUrl="http://queue/standard",
            ReceiptHandle="receipt-123",
        )

    @patch("app.worker.consumer.process_job")
    def test_failed_message_applies_backoff(self, mock_process):
        mock_process.side_effect = RuntimeError("Simulated failure")

        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._queue_url = "http://queue/standard"
        consumer._high_priority_queue_url = "http://queue/high"

        message = {
            "ReceiptHandle": "receipt-456",
            "Body": json.dumps({
                "job_id": "job-2",
                "user_id": "user-1",
                "report_type": "engagement_analytics",
                "parameters": {},
            }),
            "Attributes": {"ApproximateReceiveCount": "2"},
            "_source_queue_url": "http://queue/standard",
        }

        consumer._handle_message(message)

        consumer._client.delete_message.assert_not_called()
        consumer._client.change_message_visibility.assert_called_once()
        call_kwargs = consumer._client.change_message_visibility.call_args.kwargs
        assert call_kwargs["VisibilityTimeout"] == 20  # 10 * 2^(2-1) = 20

    @patch("app.worker.consumer.process_job")
    def test_circuit_breaker_defers_open_circuit(self, mock_process):
        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._queue_url = "http://queue/standard"
        consumer._high_priority_queue_url = "http://queue/high"

        # Manually open the circuit for failing_report
        consumer._circuit_breaker.record_failure("failing_report")
        consumer._circuit_breaker.record_failure("failing_report")
        consumer._circuit_breaker.record_failure("failing_report")

        message = {
            "ReceiptHandle": "receipt-789",
            "Body": json.dumps({
                "job_id": "job-3",
                "user_id": "user-1",
                "report_type": "failing_report",
                "parameters": {},
            }),
            "Attributes": {"ApproximateReceiveCount": "1"},
            "_source_queue_url": "http://queue/standard",
        }

        consumer._handle_message(message)

        mock_process.assert_not_called()
        consumer._client.change_message_visibility.assert_called_once()
        consumer._client.delete_message.assert_not_called()

    def test_cleanup_finished_removes_done_futures(self):
        from concurrent.futures import Future

        consumer = Consumer()
        f1 = Future()
        f2 = Future()
        f1.set_result(None)
        consumer._in_flight = {f1, f2}

        consumer._cleanup_finished()

        assert f1 not in consumer._in_flight
        assert f2 in consumer._in_flight


class TestConsumerPollQueue:
    def test_poll_skips_when_queue_urls_not_ready(self):
        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._client.get_queue_url.side_effect = Exception("QueueDoesNotExist")

        from concurrent.futures import ThreadPoolExecutor
        consumer._executor = ThreadPoolExecutor(max_workers=2)

        consumer._poll()

        consumer._client.receive_message.assert_not_called()
        consumer._executor.shutdown(wait=False)

    def test_poll_queue_returns_zero_on_empty_response(self):
        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._client.receive_message.return_value = {"Messages": []}
        consumer._queue_url = "http://queue/standard"
        consumer._high_priority_queue_url = "http://queue/high"

        from concurrent.futures import ThreadPoolExecutor
        consumer._executor = ThreadPoolExecutor(max_workers=2)

        count = consumer._poll_queue("http://queue/standard", 5)
        assert count == 0

        consumer._executor.shutdown(wait=False)

    def test_poll_queue_returns_zero_on_exception(self):
        consumer = Consumer()
        consumer._client = MagicMock()
        consumer._client.receive_message.side_effect = Exception("Network error")
        consumer._queue_url = "http://queue/standard"
        consumer._high_priority_queue_url = "http://queue/high"

        from concurrent.futures import ThreadPoolExecutor
        consumer._executor = ThreadPoolExecutor(max_workers=2)

        count = consumer._poll_queue("http://queue/standard", 5)
        assert count == 0

        consumer._executor.shutdown(wait=False)
