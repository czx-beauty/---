"""推荐路由——优先读缓存（rec_cache 表），缓存缺失时现算兜底"""
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.itemcf import engine
from app.models import Movie, RecCache, User
from app.routers.auth import get_current_user
from app.schemas import MovieOut

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=list[MovieOut])
def recommend(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """个性化推荐：读缓存（定时重算的结果）→ 没有缓存才现算兜底"""
    cached = db.scalar(
        select(RecCache).where(RecCache.user_id == current_user.id)
    )

    if cached is not None:
        movie_ids = json.loads(cached.movie_ids)[:limit]
    else:
        # 缓存未命中（如刚注册还没到重算周期）→ 现算，并顺手写缓存
        movie_ids = engine.recommend(current_user.id, limit=limit)
        db.add(RecCache(user_id=current_user.id, movie_ids=json.dumps(movie_ids)))
        db.commit()

    if not movie_ids:
        return []

    movies = db.scalars(select(Movie).where(Movie.id.in_(movie_ids))).all()
    order = {mid: i for i, mid in enumerate(movie_ids)}
    movies.sort(key=lambda m: order[m.id])
    return [MovieOut.model_validate(m) for m in movies]
