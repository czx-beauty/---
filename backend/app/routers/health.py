"""健康检查路由——验证服务和数据库连通"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie
from app.schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    """探活接口：返回服务状态 + 电影总数（证明数据库通）"""
    count = db.scalar(select(func.count(Movie.id))) or 0
    return HealthResponse(status="ok", movie_count=count)
