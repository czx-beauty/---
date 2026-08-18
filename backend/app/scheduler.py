"""定时任务——每 5 分钟重算所有用户的推荐，写入 rec_cache 表

ADR-0003：事件驱动记录 + 定时重算 + 缓存读取（餐厅备菜模式）
"""
import json
import logging

from sqlalchemy import delete, select

from app.database import SessionLocal
from app.engine.itemcf import engine
from app.models import RecCache, User

logger = logging.getLogger(__name__)


def recompute_all_recommendations():
    """全量重算：清空缓存表 → 为每个用户算推荐 → 写入。
    数据量小（学习项目），全量重算简单可靠；大数据场景会改为只重算活跃用户。"""
    with SessionLocal() as db:
        # 清空旧缓存（先删再插，保证没有陈旧数据）
        db.execute(delete(RecCache))
        user_ids = db.scalars(select(User.id)).all()

        for uid in user_ids:
            movie_ids = engine.recommend(uid, limit=20)
            if movie_ids:
                db.add(RecCache(user_id=uid, movie_ids=json.dumps(movie_ids)))

        db.commit()
        logger.info("推荐重算完成：%d 个用户", len(user_ids))
        return len(user_ids)
