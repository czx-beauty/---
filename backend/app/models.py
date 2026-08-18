"""ORM 模型——数据库表结构（对应 CONTEXT.md 领域词汇）"""
from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """用户（User）：注册登录的网站使用者"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # bcrypt 哈希，绝不存明文
    nickname: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Movie(Base):
    """电影（Movie）：推荐的基本内容单元，来自 ml-latest-small"""
    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # 即 movieId
    title: Mapped[str] = mapped_column(String(255), index=True)
    genres: Mapped[str] = mapped_column(String(255), default="")  # "Adventure|Animation|..."


class Rating(Base):
    """评分（Rating）：用户对电影的显式评价 1-5 星"""
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="uq_rating_user_movie"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)      # 数据集原始用户，非本网站用户
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id"), index=True)
    rating: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[int] = mapped_column(Integer)


class ClickEvent(Base):
    """行为事件（Event）：用户点击/互动记录，定时重算的数据来源"""
    __tablename__ = "click_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id"), index=True)
    action: Mapped[str] = mapped_column(String(20))  # like / fav / thumbs_up / bad
    delta: Mapped[float] = mapped_column(Float, default=0.0)  # 对最终星数的贡献
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecCache(Base):
    """推荐缓存（Recommendation Cache）：定时重算的「用户→推荐列表」"""
    __tablename__ = "rec_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    movie_ids: Mapped[str] = mapped_column(Text)  # JSON 数组字符串，如 "[1,3,5]"
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
