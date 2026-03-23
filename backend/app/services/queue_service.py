import json

import boto3

from app.core.config import settings


class QueueService:
    def __init__(self):
        self._client = None
        self._queue_url = None

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

    def publish_job(self, job_id: str, user_id: str, report_type: str, parameters: dict) -> None:
        message = {
            "job_id": job_id,
            "user_id": user_id,
            "report_type": report_type,
            "parameters": parameters,
        }
        self.client.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(message),
        )


queue_service = QueueService()
