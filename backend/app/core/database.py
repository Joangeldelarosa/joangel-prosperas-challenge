import boto3

from app.core.config import settings


def _get_client_kwargs() -> dict:
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return kwargs


def get_dynamodb_resource():
    return boto3.resource("dynamodb", **_get_client_kwargs())


def get_dynamodb_client():
    return boto3.client("dynamodb", **_get_client_kwargs())


def get_jobs_table():
    dynamodb = get_dynamodb_resource()
    return dynamodb.Table(settings.dynamodb_jobs_table)


def get_users_table():
    dynamodb = get_dynamodb_resource()
    return dynamodb.Table(settings.dynamodb_users_table)
