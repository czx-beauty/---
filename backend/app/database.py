"""数据库引擎与会话管理（SQLAlchemy 2.0 风格）"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""

def get_db():
    """FastAPI 依赖：每个请求一个数据库会话，用完自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
