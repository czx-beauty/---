"""FastAPI 入口——装配应用、建表、挂路由"""
from fastapi import FastAPI
from app.database import Base, engine
from app.routers import auth, events, health, movies
import app.models  # noqa: F401  确保模型注册到 Base.metadata

app = FastAPI(title="Movie Recommender API", version="0.1.0")

# 启动时建表（开发阶段简单粗暴；生产用迁移工具 Alembic）
@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

app.include_router(health.router)
app.include_router(movies.router)
app.include_router(auth.router)
app.include_router(events.router)
