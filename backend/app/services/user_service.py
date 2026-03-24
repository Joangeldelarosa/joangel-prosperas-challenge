import uuid

from app.core.database import get_users_table
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.models.user import User


class UserService:
    def register(self, username: str, password: str) -> User:
        table = get_users_table()
        # Check if username already exists
        response = table.query(
            IndexName="username-index",
            KeyConditionExpression="username = :u",
            ExpressionAttributeValues={":u": username},
        )
        if response.get("Items"):
            raise ConflictError("El nombre de usuario ya está en uso")

        user = User(
            user_id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(password),
        )
        table.put_item(Item=user.to_dict())
        return user

    def authenticate(self, username: str, password: str) -> User:
        table = get_users_table()
        response = table.query(
            IndexName="username-index",
            KeyConditionExpression="username = :u",
            ExpressionAttributeValues={":u": username},
        )
        items = response.get("Items", [])
        if not items:
            raise UnauthorizedError()

        user = User.from_dict(items[0])
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError()

        return user


user_service = UserService()
