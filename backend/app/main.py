"""FastAPI 入口——装配应用、建表、挂路由、启动定时任务"""
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from app.database import Base, engine
from app.routers import auth, events, health, movies, recommendations
from app.scheduler import recompute_all_recommendations
import app.models  # noqa: F401  确保模型注册到 Base.metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 后台调度器：每 5 分钟重算推荐（ADR-0003）
scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时建表 + 开定时器，关闭时停定时器"""
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(
        recompute_all_recommendations,
        trigger="interval",
        minutes=5,
        id="recompute_recs",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("定时任务已启动：每 5 分钟重算推荐")
    recompute_all_recommendations()  # 启动时先算一次，避免冷启动无缓存
    yield
    scheduler.shutdown()


app = FastAPI(title="Movie Recommender API", version="0.1.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(movies.router)
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(recommendations.router)
