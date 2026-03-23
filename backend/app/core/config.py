from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    app_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # AWS
    aws_region: str = "us-east-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_endpoint_url: str | None = None  # None = real AWS, set for LocalStack

    # SQS
    sqs_queue_name: str = "report-jobs"
    sqs_dlq_name: str = "report-jobs-dlq"
    sqs_max_receive_count: int = 3

    # DynamoDB
    dynamodb_jobs_table: str = "jobs"
    dynamodb_users_table: str = "users"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # Worker
    worker_concurrency: int = 2
    worker_poll_interval: int = 5

    # S3
    s3_bucket_name: str = "report-results"

    @property
    def is_local(self) -> bool:
        return self.aws_endpoint_url is not None


settings = Settings()
