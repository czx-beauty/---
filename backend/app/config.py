"""应用配置——从环境变量读取，带默认值"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库连接（本地开发默认值；上线时用环境变量覆盖）
    database_url: str = "postgresql+psycopg://czx:czx@localhost:5432/movie_recommender"
    # JWT 密钥（生产环境必须换成随机值）
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 小时

settings = Settings()
