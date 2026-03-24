import uuid
from datetime import UTC, datetime

from boto3.dynamodb.conditions import Key

from app.core.database import get_jobs_table
from app.core.exceptions import NotFoundError
from app.models.job import Job


class JobService:
    def create_job(self, user_id: str, report_type: str, parameters: dict) -> Job:
        job = Job(
            job_id=str(uuid.uuid4()),
            user_id=user_id,
            status="PENDING",
            report_type=report_type,
            parameters=parameters,
        )
        table = get_jobs_table()
        table.put_item(Item=job.to_dict())
        return job

    def get_job(self, job_id: str, user_id: str) -> Job:
        table = get_jobs_table()
        response = table.get_item(Key={"job_id": job_id})
        item = response.get("Item")
        if not item or item.get("user_id") != user_id:
            raise NotFoundError("Trabajo no encontrado")
        return Job.from_dict(item)

    def list_jobs(self, user_id: str, page: int = 1, per_page: int = 20) -> dict:
        table = get_jobs_table()
        response = table.query(
            IndexName="user_id-index",
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,  # newest first
        )
        all_items = response.get("Items", [])
        total = len(all_items)
        start = (page - 1) * per_page
        end = start + per_page
        page_items = all_items[start:end]
        jobs = [Job.from_dict(item) for item in page_items]
        return {
            "jobs": jobs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "has_next": end < total,
        }

    def update_job_status(
        self, job_id: str, status: str, result_url: str | None = None
    ) -> None:
        table = get_jobs_table()
        update_expr = "SET #s = :status, updated_at = :updated_at"
        expr_values: dict = {
            ":status": status,
            ":updated_at": datetime.now(UTC).isoformat(),
        }
        expr_names = {"#s": "status"}
        if result_url is not None:
            update_expr += ", result_url = :result_url"
            expr_values[":result_url"] = result_url
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names,
        )


job_service = JobService()
