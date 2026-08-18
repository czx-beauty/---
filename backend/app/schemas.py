"""Pydantic 模型——API 请求/响应的数据形状（与 ORM 分离）"""
from datetime import datetime
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    movie_count: int


class MovieOut(BaseModel):
    id: int
    title: str
    genres: str
    avg_rating: float | None = None   # 数据集平均分（×2 折算 10 分制；没评分则 None）
    rating_count: int = 0

    model_config = {"from_attributes": True}  # 允许从 ORM 对象直接转换


class MovieListOut(BaseModel):
    total: int            # 符合条件的总数（前端可显示/分页）
    items: list[MovieOut]


class MovieDetailOut(BaseModel):
    id: int
    title: str
    genres: str
    avg_rating: float | None   # 数据集平均分（可空：没评分的新电影）
    rating_count: int          # 评分人数
