import json

import boto3

from app.core.config import settings

HIGH_PRIORITY_TYPES = {"revenue_breakdown"}


class QueueService:
    def __init__(self):
        self._client = None
        self._queue_url = None
        self._high_priority_queue_url = None

    @property
    def client(self):
        if self._client is None:
            kwargs = {"region_name": settings.aws_region}
            if settings.aws_endpoint_url:
                kwargs["endpoint_url"] = settings.aws_endpoint_url
                kwargs["aws_access_key_id"] = settings.aws_access_key_id
                kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            self._client = boto3.client("sqs", **kwargs)
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

    def publish_job(self, job_id: str, user_id: str, report_type: str, parameters: dict) -> None:
        message = {
            "job_id": job_id,
            "user_id": user_id,
            "report_type": report_type,
            "parameters": parameters,
        }
        queue_url = self.high_priority_queue_url if report_type in HIGH_PRIORITY_TYPES else self.queue_url
        self.client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message),
        )


queue_service = QueueService()
