"""认证路由——注册 / 登录 / 获取当前用户"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TokenOut, UserCreate, UserLogin
from app.security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# HTTPBearer：FastAPI 自动从请求头提取 "Authorization: Bearer <token>"
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """依赖：解析 JWT → 返回当前用户。其他接口 Depends(这个) 就受保护了"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="未登录")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="登录已过期或令牌无效")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """注册：校验用户名唯一 → 哈希密码 → 建用户 → 直接发 token（注册即登录）"""
    exists = db.scalar(select(User).where(User.username == data.username))
    if exists:
        raise HTTPException(status_code=400, detail="用户名已被占用")

    user = User(username=data.username, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    return TokenOut(access_token=token, user_id=user.id, username=user.username)


@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """登录：查用户 → bcrypt 校验密码 → 发 token"""
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        # 统一报错信息：不泄露「用户名不存在」还是「密码错」（防枚举攻击）
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user.id, user.username)
    return TokenOut(access_token=token, user_id=user.id, username=user.username)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    """受保护接口示例：返回当前登录用户信息（带 token 才能访问）"""
    return {"id": current_user.id, "username": current_user.username, "nickname": current_user.nickname}
