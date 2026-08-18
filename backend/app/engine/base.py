"""推荐引擎接口——所有推荐算法实现这个接口，上层路由只认接口"""
from abc import ABC, abstractmethod
from typing import Sequence


class RecommendationEngine(ABC):
    """推荐引擎抽象：定义「怎么给用户推荐」的契约
    ADR-0004：v1 用 ItemCF 实现，将来可替换为向量召回/双塔而不动上层"""

    @abstractmethod
    def recommend(self, user_id: int, limit: int = 10) -> Sequence[int]:
        """给用户返回推荐电影 ID 列表（按推荐强度降序）"""
