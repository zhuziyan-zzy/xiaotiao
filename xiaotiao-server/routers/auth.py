from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.auth_service import (
    authenticate_user,
    create_user_session,
    extract_token,
    logout_session,
    register_user,
    require_user,
)

router = APIRouter(prefix="/auth", tags=["认证"])


class AuthRequest(BaseModel):
    username: str
    password: str


@router.post(
    "/register",
    summary="注册账号",
    description="创建新用户并返回登录 Token。",
)
def register(body: AuthRequest):
    user = register_user(body.username.strip(), body.password)
    token = create_user_session(user["id"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"]}}


@router.post(
    "/login",
    summary="登录",
    description="校验用户名密码并返回登录 Token。",
)
def login(body: AuthRequest):
    user = authenticate_user(body.username.strip(), body.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_user_session(user["id"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"]}}


@router.get(
    "/me",
    summary="当前用户",
    description="获取当前登录用户信息。",
)
def me(request: Request):
    user = require_user(request)
    return {"user": {"id": user["id"], "username": user["username"]}}


@router.post(
    "/logout",
    summary="退出登录",
    description="注销当前登录 Token。",
)
def logout(request: Request):
    token = extract_token(request)
    logout_session(token)
    return {"ok": True}
