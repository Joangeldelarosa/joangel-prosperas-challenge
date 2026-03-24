import json
import logging
from concurrent.futures import Future, ThreadPoolExecutor

import boto3

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.worker.circuit_breaker import CircuitBreaker
from app.worker.processor import process_job

logger = logging.getLogger(__name__)


class Consumer:
    """SQS consumer that polls messages and processes them concurrently."""

    def __init__(self):
        self._running = False
        self._client = None
        self._queue_url: str | None = None
        self._high_priority_queue_url: str | None = None
        self._executor: ThreadPoolExecutor | None = None
        self._in_flight: set[Future[None]] = set()
        self._circuit_breaker = CircuitBreaker(
            failure_threshold=settings.circuit_breaker_threshold,
            recovery_timeout=settings.circuit_breaker_timeout,
        )

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client("sqs", **_get_client_kwargs())
        return self._client

    @property
    def queue_url(self) -> str:
        if self._queue_url is None:
            response = self.client.get_queue_url(QueueName=settings.sqs_queue_name)
            self._queue_url = response["QueueUrl"]
        return self._queue_url

    @property
    def high_priority_queue_url(self) -> str:
        if self._high_priority_queue_url is None:
            response = self.client.get_queue_url(QueueName=settings.sqs_high_priority_queue_name)
            self._high_priority_queue_url = response["QueueUrl"]
        return self._high_priority_queue_url

    def start(self) -> None:
        """Start the polling loop. Blocks until stop() is called."""
        self._running = True
        logger.info(
            "Consumer starting — queue=%s, concurrency=%d, poll_interval=%ds",
            settings.sqs_queue_name,
            settings.worker_concurrency,
            settings.worker_poll_interval,
        )
        self._executor = ThreadPoolExecutor(max_workers=settings.worker_concurrency)

        try:
            while self._running:
                self._poll()
        finally:
            self._executor.shutdown(wait=True)
            logger.info("Consumer stopped")

    def stop(self) -> None:
        """Signal the polling loop to stop after the current iteration."""
        logger.info("Consumer shutdown requested")
        self._running = False

    def _cleanup_finished(self) -> None:
        """Remove completed futures from the in-flight set."""
        done = {f for f in self._in_flight if f.done()}
        for f in done:
            exc = f.exception()
            if exc:
                logger.error("Worker thread failed: %s", exc)
        self._in_flight -= done

    def _poll(self) -> None:
        """Poll SQS for messages, prioritizing the high-priority queue."""
        self._cleanup_finished()

        available = settings.worker_concurrency - len(self._in_flight)
        if available <= 0:
            import time
            time.sleep(1)
            return

        # 1. Poll HIGH priority queue first (short poll to avoid blocking)
        dispatched = self._poll_queue(self.high_priority_queue_url, available, wait_seconds=0)

        # 2. If slots remain, poll STANDARD queue (long poll)
        remaining = available - dispatched
        if remaining > 0:
            self._poll_queue(self.queue_url, remaining, wait_seconds=settings.worker_poll_interval)

    def _poll_queue(self, queue_url: str, max_messages: int, wait_seconds: int = 0) -> int:
        """Poll a specific queue and dispatch messages. Returns count dispatched."""
        try:
            response = self.client.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=min(max_messages, 10),
                WaitTimeSeconds=wait_seconds,
                AttributeNames=["ApproximateReceiveCount"],
            )
        except Exception:
            logger.exception("Failed to receive messages from %s", queue_url)
            return 0

        messages = response.get("Messages", [])
        if not messages:
            return 0

        logger.info("Received %d message(s) from %s, in-flight=%d", len(messages), queue_url, len(self._in_flight))

        for message in messages:
            # Tag the message with its source queue URL for ack/nack
            message["_source_queue_url"] = queue_url
            future = self._executor.submit(self._handle_message, message)
            self._in_flight.add(future)

        return len(messages)

    def _handle_message(self, message: dict) -> None:
        """Parse, process, and acknowledge a single SQS message."""
        receipt_handle = message["ReceiptHandle"]
        source_queue_url = message.get("_source_queue_url", self.queue_url)
        receive_count = int(message.get("Attributes", {}).get("ApproximateReceiveCount", 1))
        body = json.loads(message["Body"])

        job_id = body["job_id"]
        user_id = body["user_id"]
        report_type = body["report_type"]
        parameters = body.get("parameters", {})

        logger.info("Processing message for job_id=%s (attempt %d)", job_id, receive_count)

        # Circuit Breaker check
        if not self._circuit_breaker.can_execute(report_type):
            wait = self._circuit_breaker.time_until_half_open(report_type)
            logger.warning(
                "Circuit OPEN for report_type=%s, deferring job %s for %ds",
                report_type, job_id, wait,
            )
            self.client.change_message_visibility(
                QueueUrl=source_queue_url,
                ReceiptHandle=receipt_handle,
                VisibilityTimeout=wait,
            )
            return

        try:
            process_job(job_id, user_id, report_type, parameters)

            self._circuit_breaker.record_success(report_type)

            # Delete message only after successful processing
            self.client.delete_message(
                QueueUrl=source_queue_url,
                ReceiptHandle=receipt_handle,
            )
            logger.info("Message acknowledged for job_id=%s", job_id)
        except Exception:
            self._circuit_breaker.record_failure(report_type)

            delay = min(
                settings.retry_base_delay * (2 ** (receive_count - 1)),
                settings.retry_max_delay,
            )
            logger.warning(
                "Job %s failed (attempt %d), backoff %ds before retry",
                job_id,
                receive_count,
                delay,
            )
            self.client.change_message_visibility(
                QueueUrl=source_queue_url,
                ReceiptHandle=receipt_handle,
                VisibilityTimeout=delay,
            )
