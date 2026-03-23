import json
import logging
from concurrent.futures import ThreadPoolExecutor

import boto3

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.worker.processor import process_job

logger = logging.getLogger(__name__)


class Consumer:
    """SQS consumer that polls messages and processes them concurrently."""

    def __init__(self):
        self._running = False
        self._client = None
        self._queue_url: str | None = None
        self._executor: ThreadPoolExecutor | None = None

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

    def _poll(self) -> None:
        """Poll SQS for messages and dispatch them to the thread pool."""
        try:
            response = self.client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=settings.worker_poll_interval,
            )
        except Exception:
            logger.exception("Failed to receive messages from SQS")
            return

        messages = response.get("Messages", [])
        if not messages:
            return

        logger.info("Received %d message(s)", len(messages))

        futures = {}
        for message in messages:
            future = self._executor.submit(self._handle_message, message)
            futures[future] = message

        for future in futures:
            try:
                future.result()
            except Exception:
                # Error already logged inside _handle_message; message stays in queue for retry/DLQ
                pass

    def _handle_message(self, message: dict) -> None:
        """Parse, process, and acknowledge a single SQS message."""
        receipt_handle = message["ReceiptHandle"]
        body = json.loads(message["Body"])

        job_id = body["job_id"]
        user_id = body["user_id"]
        report_type = body["report_type"]
        parameters = body.get("parameters", {})

        logger.info("Processing message for job_id=%s", job_id)

        process_job(job_id, user_id, report_type, parameters)

        # Delete message only after successful processing
        self.client.delete_message(
            QueueUrl=self.queue_url,
            ReceiptHandle=receipt_handle,
        )
        logger.info("Message acknowledged for job_id=%s", job_id)
