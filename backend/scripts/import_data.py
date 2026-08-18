"""数据导入脚本：ml-latest-small CSV → PostgreSQL（幂等：重复跑不重复导入）

用法：uv run python scripts/import_data.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.database import Base, SessionLocal, engine
from app.models import Movie, Rating

DATA_DIR = Path.home() / "Downloads" / "ml-latest-small"


def import_movies(db):
    """movies.csv → movies 表（movieId, title, genres）"""
    existing = set(db.scalars(select(Movie.id)).all())
    added = 0
    with open(DATA_DIR / "movies.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["movieId"])
            if mid in existing:
                continue
            db.add(Movie(id=mid, title=row["title"], genres=row["genres"]))
            existing.add(mid)
            added += 1
    db.commit()
    print(f"movies: 新增 {added} 部（已存在 {len(existing) - added} 部跳过）")
    return len(existing)


def import_ratings(db):
    """ratings.csv → ratings 表（只导入评分 >= 4 的，作为「喜欢」信号二值化）"""
    total = 0
    kept = 0
    with open(DATA_DIR / "ratings.csv", newline="", encoding="utf-8") as f:
        batch = []
        for row in csv.DictReader(f):
            total += 1
            rating = float(row["rating"])
            if rating < 4.0:  # 只保留 >=4 的评分 = 喜欢信号（ADR-0001 二值化）
                continue
            batch.append(Rating(
                user_id=int(row["userId"]),
                movie_id=int(row["movieId"]),
                rating=rating,
                timestamp=int(row["timestamp"]),
            ))
            kept += 1
            if len(batch) >= 5000:  # 分批提交，避免一次性内存过大
                db.add_all(batch)
                db.commit()
                batch.clear()
        if batch:
            db.add_all(batch)
            db.commit()
    print(f"ratings: 共 {total} 条，保留 >=4 分 {kept} 条（喜欢信号）")


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        n_movies = import_movies(db)
        import_ratings(db)
    print(f"完成！数据库现有 {n_movies} 部电影")


if __name__ == "__main__":
    main()
