"""ItemCF 协同过滤推荐引擎——物以类聚：推荐和你喜欢电影相似的电影

原理（之前讲过的知识实战）：
1. 用户-电影矩阵：行=用户，列=电影，值=是否喜欢（评分>=4 二值化，ADR-0001）
2. 电影向量 = 哪些用户喜欢它 → 余弦相似度 = 电影间相似度
3. 推荐 = 你喜欢的电影的相似电影，按相似度加权汇总，排除已看过的
"""
import logging
from functools import lru_cache
from typing import Sequence

import numpy as np
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.engine.base import RecommendationEngine
from app.models import ClickEvent, Movie, Rating

logger = logging.getLogger(__name__)

# 每种互动对「喜好强度」的权重（推荐打分用，与星数 delta 独立）
ACTION_WEIGHT = {"like": 2.0, "fav": 1.0, "thumbs_up": 1.0, "bad": -2.0}

# 默认给多少相似电影（控制内存）
TOP_SIM = 30


class ItemCFEngine(RecommendationEngine):
    """ItemCF：基于全局评分数据预计算电影相似度，基于用户互动做个性化推荐"""

    def __init__(self):
        self._sim: np.ndarray | None = None      # 电影相似度矩阵（懒加载）
        self._movie_ids: list[int] | None = None  # 相似度矩阵的行/列 → 电影 ID 映射

    # ---------- 预计算：电影相似度矩阵（启动后首次调用时算一次，缓存） ----------
    def _ensure_sim_matrix(self):
        """从 ratings 表构建用户-电影矩阵 → 算余弦相似度。结果缓存，数据变了调 invalidate"""
        if self._sim is not None:
            return

        with SessionLocal() as db:
            rows = db.execute(
                select(Rating.user_id, Rating.movie_id).where(Rating.rating >= 4.0)
            ).all()

        # 用户和电影的 ID → 矩阵行列号
        user_ids = sorted({r[0] for r in rows})
        self._movie_ids = sorted({r[1] for r in rows})
        user_index = {uid: i for i, uid in enumerate(user_ids)}
        movie_index = {mid: i for i, mid in enumerate(self._movie_ids)}

        # 稀疏矩阵：行=用户，列=电影，值=1（喜欢）
        data = np.ones(len(rows))
        row = np.array([user_index[r[0]] for r in rows])
        col = np.array([movie_index[r[1]] for r in rows])
        matrix = sparse.csr_matrix((data, (row, col)), shape=(len(user_ids), len(self._movie_ids)))

        # 余弦相似度：电影×电影（结果矩阵 [n_movies, n_movies]）
        logger.info("计算电影相似度矩阵：%d 部电影…", len(self._movie_ids))
        self._sim = cosine_similarity(matrix.T)
        logger.info("相似度矩阵完成")

    # ---------- 推荐核心 ----------
    def recommend(self, user_id: int, limit: int = 10) -> Sequence[int]:
        self._ensure_sim_matrix()
        assert self._sim is not None and self._movie_ids is not None

        with SessionLocal() as db:
            # 1. 用户的行为：哪些电影喜欢了（加权），哪些差评了（负权）
            events = db.execute(
                select(ClickEvent.movie_id, ClickEvent.action).where(ClickEvent.user_id == user_id)
            ).all()
            watched_ids = db.scalars(
                select(ClickEvent.movie_id).where(ClickEvent.user_id == user_id)
            ).all()

            # 2. 冷启动：没有互动 → 返回全局高分热门
            if not events:
                return self._cold_start(db, limit)

        # 3. 用户喜好向量：喜欢的电影集合 + 权重（like 重，bad 负）
        weights: dict[int, float] = {}
        for movie_id, action in events:
            weights[movie_id] = weights.get(movie_id, 0) + ACTION_WEIGHT[action]

        # 4. 打分：对每个候选电影 = Σ(我喜欢的电影i × 相似度(i, 候选))
        scores: dict[int, float] = {}
        for liked_id, w in weights.items():
            if liked_id not in self._movie_ids:
                continue  # 该电影不在评分数据集里，无相似度
            col = self._movie_ids.index(liked_id)
            sim_col = self._sim[:, col]
            # 取相似度最高的 TOP_SIM 个候选
            top_idx = np.argsort(sim_col)[-TOP_SIM:]
            for idx in top_idx:
                cand_id = self._movie_ids[idx]
                if cand_id in watched_ids:  # 排除已互动的
                    continue
                scores[cand_id] = scores.get(cand_id, 0) + sim_col[idx] * w

        # 5. 按分数降序取 top
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        return [mid for mid, _ in ranked[:limit]]

    def _cold_start(self, db: Session, limit: int) -> list[int]:
        """冷启动：无互动用户 → 推荐全局最高分电影（热门兜底）"""
        from sqlalchemy import func
        rows = db.execute(
            select(Rating.movie_id, func.avg(Rating.rating).label("avg"))
            .group_by(Rating.movie_id)
            .order_by(func.avg(Rating.rating).desc())
            .limit(limit)
        ).all()
        return [r[0] for r in rows]


# 模块级单例：整个应用共享一个引擎（矩阵只算一次）
engine = ItemCFEngine()
