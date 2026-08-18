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

    model_config = {"from_attributes": True}  # 允许从 ORM 对象直接转换
