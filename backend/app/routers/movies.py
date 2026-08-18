"""电影浏览路由——列表/搜索/类型筛选/详情"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie, Rating
from app.schemas import MovieDetailOut, MovieListOut, MovieOut

router = APIRouter(prefix="/api/movies", tags=["movies"])


# 评分聚合子查询：每个电影的平均分（5 分制）×2 → 10 分制，和评分人数
# 用子查询一次算出，避免对每个电影单独查详情（N+1 问题）
rating_agg = (
    select(
        Rating.movie_id,
        (func.avg(Rating.rating) * 2).label("avg10"),
        func.count(Rating.id).label("cnt"),
    )
    .group_by(Rating.movie_id)
    .subquery()
)


def _to_movie_out(movie: Movie, agg_row) -> MovieOut:
    """把电影 ORM + 聚合行组装成输出模型"""
    return MovieOut(
        id=movie.id,
        title=movie.title,
        genres=movie.genres,
        avg_rating=round(agg_row.avg10, 2) if agg_row.avg10 is not None else None,
        rating_count=agg_row.cnt or 0,
    )


@router.get("", response_model=MovieListOut)
def list_movies(
    q: str | None = Query(None, description="搜索关键词（标题或类型）"),
    genre: str | None = Query(None, description="类型筛选，如 Sci-Fi"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """电影列表：支持搜索 / 类型筛选 / 分页，每部带平均分"""
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
    movies = db.scalars(
        stmt.offset((page - 1) * page_size).limit(page_size)
    ).all()

    # 一次性查出这些电影的聚合分（IN 查询，避免 N+1）
    if movies:
        ids = [m.id for m in movies]
        agg_rows = db.execute(
            rating_agg.select().where(rating_agg.c.movie_id.in_(ids))
        ).mappings().all()
        agg_map = {r["movie_id"]: r for r in agg_rows}
        items = [_to_movie_out(m, agg_map.get(m.id)) for m in movies]
    else:
        items = []

    return MovieListOut(total=total, items=items)


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
