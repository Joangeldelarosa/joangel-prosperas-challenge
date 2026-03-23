from fastapi import APIRouter, status

from app.core.security import create_access_token
from app.models.schemas import AuthRequest, AuthResponse, LoginResponse
from app.services.user_service import user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: AuthRequest):
    user = user_service.register(request.username, request.password)
    token = create_access_token(user.user_id)
    return AuthResponse(user_id=user.user_id, token=token)


@router.post("/login", response_model=LoginResponse)
def login(request: AuthRequest):
    user = user_service.authenticate(request.username, request.password)
    token = create_access_token(user.user_id)
    return LoginResponse(token=token)
