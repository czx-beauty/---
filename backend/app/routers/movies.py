"""电影浏览路由——列表/搜索/类型筛选/详情"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie, Rating
from app.schemas import MovieDetailOut, MovieListOut, MovieOut

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("", response_model=MovieListOut)
def list_movies(
    q: str | None = Query(None, description="搜索关键词（标题或类型）"),
    genre: str | None = Query(None, description="类型筛选，如 Sci-Fi"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """电影列表：支持搜索 / 类型筛选 / 分页"""
    stmt = select(Movie)
    if q:
        # ILIKE = 大小写不敏感的模糊匹配（SQL 的 LIKE 是大小写敏感的）
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(Movie.title.ilike(pattern), Movie.genres.ilike(pattern))
        )
    if genre:
        stmt = stmt.where(Movie.genres.ilike(f"%{genre}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.offset((page - 1) * page_size).limit(page_size)
    ).all()

    return MovieListOut(total=total, items=[MovieOut.model_validate(m) for m in items])


@router.get("/{movie_id}", response_model=MovieDetailOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """电影详情：基础信息 + 数据集平均分和评分人数"""
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="电影不存在")

    agg = db.execute(
        select(func.avg(Rating.rating), func.count(Rating.id)).where(
            Rating.movie_id == movie_id
        )
    ).one()
    avg_rating = round(agg[0], 2) if agg[0] is not None else None

    return MovieDetailOut(
        id=movie.id, title=movie.title, genres=movie.genres,
        avg_rating=avg_rating, rating_count=agg[1],
    )
