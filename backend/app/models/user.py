from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class User:
    user_id: str
    username: str
    password_hash: str
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "password_hash": self.password_hash,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            user_id=data["user_id"],
            username=data["username"],
            password_hash=data["password_hash"],
            created_at=data.get("created_at", ""),
        )
