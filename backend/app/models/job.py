from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Job:
    job_id: str
    user_id: str
    status: str  # PENDING | PROCESSING | COMPLETED | FAILED
    report_type: str
    parameters: dict
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    result_url: str | None = None

    def to_dict(self) -> dict:
        data = {
            "job_id": self.job_id,
            "user_id": self.user_id,
            "status": self.status,
            "report_type": self.report_type,
            "parameters": self.parameters,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.result_url is not None:
            data["result_url"] = self.result_url
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Job":
        return cls(
            job_id=data["job_id"],
            user_id=data["user_id"],
            status=data["status"],
            report_type=data["report_type"],
            parameters=data.get("parameters", {}),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            result_url=data.get("result_url"),
        )
