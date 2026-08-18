"""安全模块——密码哈希 + JWT 令牌（认证核心）"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# bcrypt 密码哈希器（自动加盐，哈希不可逆）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """明文密码 → bcrypt 哈希（绝不存明文）"""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """校验密码：登录时用 bcrypt 比对"""
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, username: str) -> str:
    """生成 JWT：把用户身份编码进令牌，过期时间由配置控制"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """解析 JWT：校验签名和过期时间，成功返回 payload，失败返回 None"""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
