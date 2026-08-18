"""推荐路由——给登录用户返回个性化推荐"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.itemcf import engine
from app.models import Movie, User
from app.routers.auth import get_current_user
from app.schemas import MovieOut

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=list[MovieOut])
def recommend(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """个性化推荐：ItemCF 基于用户互动计算（T8 后改为读缓存）"""
    movie_ids = engine.recommend(current_user.id, limit=limit)
    if not movie_ids:
        return []

    # 按推荐顺序取电影信息（IN 查询保持顺序）
    movies = db.scalars(select(Movie).where(Movie.id.in_(movie_ids))).all()
    order = {mid: i for i, mid in enumerate(movie_ids)}
    movies.sort(key=lambda m: order[m.id])
    return [MovieOut.model_validate(m) for m in movies]
