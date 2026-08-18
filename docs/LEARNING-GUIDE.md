# 电影推荐网站 —— 全流程学习指南

> **目标读者**：正在学习机器学习/深度学习的初学者（会 Python）
> **学完你将掌握**：从零搭建一个企业级全栈项目的完整流程——前端交互设计、后端 API、数据库建模、推荐算法、定时任务、部署前的一切
> **配套**：本项目的真实代码（本仓库）+ 完整开发日志（`docs/PROJECT-LOG.md`）

---

## 目录

1. [项目全景](#1-项目全景)
2. [前置知识清单](#2-前置知识清单)
3. [阶段 0：环境搭建](#3-阶段-0环境搭建)
4. [阶段 1：UI 设计（prototype 流程）](#4-阶段-1ui-设计prototype-流程)
5. [阶段 2：后端骨架（FastAPI + PostgreSQL）](#5-阶段-2后端骨架fastapi--postgresql)
6. [阶段 3：数据导入](#6-阶段-3数据导入)
7. [阶段 4：认证系统（JWT）](#7-阶段-4认证系统jwt)
8. [阶段 5：电影浏览 API](#8-阶段-5电影浏览-api)
9. [阶段 6：行为事件 API](#9-阶段-6行为事件-api)
10. [阶段 7：推荐引擎（ItemCF）](#10-阶段-7推荐引擎itemcf)
11. [阶段 8：定时重算 + 缓存](#11-阶段-8定时重算--缓存)
12. [阶段 9：前端全链路联调](#12-阶段-9前端全链路联调)
13. [面试考点总结](#13-面试考点总结)
14. [扩展方向](#14-扩展方向)

---

## 1. 项目全景

### 1.1 我们做什么

做一个**电影推荐网站**：用户注册登录后浏览电影、点击「喜欢/收藏/点赞/差评」，系统根据用户行为**学习其喜好**，定时更新**个性化推荐**。

### 1.2 技术栈总览

| 层 | 技术 | 为什么选它 |
|---|---|---|
| 前端 | React 18 + Vite | 最流行的组件化前端框架 |
| 后端 | FastAPI | Python 现代 API 框架，自动文档 |
| 数据库 | PostgreSQL 16 | 工业标准关系型数据库 |
| 认证 | JWT + bcrypt | 无状态会话 + 安全密码存储 |
| 推荐算法 | ItemCF 协同过滤 | 经典入门算法，效果直观 |
| 定时任务 | APScheduler | 每 5 分钟重算推荐 |
| 包管理 | uv + npm | 现代、快速 |

### 1.3 系统架构图

```
┌─────────────────────────────────────────────────┐
│ 前端 React (localhost:5173)                      │
│  ├─ AuthPage.jsx   登录/注册                     │
│  ├─ Home.jsx       首页五视图 + 互动星级          │
│  └─ api.js         fetch 封装（JWT 自动附带）     │
└───────────────┬─────────────────────────────────┘
                │ /api/* (Vite 代理 → 8000)
┌───────────────▼─────────────────────────────────┐
│ 后端 FastAPI (localhost:8000)                    │
│  ├─ routers/auth.py           注册/登录/JWT      │
│  ├─ routers/movies.py         电影浏览 API       │
│  ├─ routers/events.py         行为事件(互动)     │
│  ├─ routers/recommendations.py 推荐(读缓存)      │
│  ├─ engine/itemcf.py          ItemCF 推荐引擎   │
│  └─ scheduler.py              APScheduler 定时  │
└───────────────┬─────────────────────────────────┘
                │ SQLAlchemy ORM
┌───────────────▼─────────────────────────────────┐
│ PostgreSQL 16 (movie_recommender 库)             │
│  users / movies / ratings / click_events /       │
│  rec_cache                                       │
└─────────────────────────────────────────────────┘
```

### 1.4 推荐系统核心思想（贯穿全程）

**万物皆向量**：用户是一个向量，电影是一个向量，兴趣匹配 = 向量距离近。

推荐系统三步走：
```
① 召回（海选）  千万 → 几百      快，但粗
② 排序（精挑）  几百 → 几十      慢，但准
③ 重排（微调）  几十 → 最终      去重、多样性
```

本项目实现的是简化版：**协同过滤（ItemCF）= 物以类聚**——推荐和你喜欢电影相似的电影。

---

## 2. 前置知识清单

开始前你应该知道（不用精通，用到再查）：

| 知识 | 需要掌握到什么程度 |
|---|---|
| Python 基础 | 函数、类、列表推导、dict |
| SQL 基础 | SELECT/JOIN/GROUP BY（PostgreSQL 与 MySQL 95% 兼容）|
| Git 基础 | add/commit/push/分支 |
| HTTP 基础 | GET/POST/DELETE、JSON、状态码（200/400/401/404/500）|
| 前端三件套 | HTML/CSS/JS 基础（React 边做边学）|

> 💡 本指南假设你已装好：Homebrew、uv、Node.js 18+、Git。

---

## 3. 阶段 0：环境搭建

### 3.1 安装 PostgreSQL 16

```bash
brew install postgresql@16      # 安装（约 1 分钟）
brew services start postgresql@16  # 启动并开机自启
pg_isready                      # 验证：输出 "/tmp:5432 - 接受连接" 即成功
```

**概念**：PostgreSQL 是**关系型数据库**——数据以「表」存储，表里有行（记录）和列（字段），表之间通过外键关联。

### 3.2 创建数据库和用户

```bash
psql -d postgres -c "CREATE USER czx WITH PASSWORD 'czx';"
psql -d postgres -c "CREATE DATABASE movie_recommender OWNER czx;"
```

**概念**：
- `psql` 是 PostgreSQL 的命令行客户端
- 数据库用户名 `czx` / 密码 `czx`（开发用；生产必须强密码 + 环境变量）
- 连接串格式：`postgresql+psycopg://用户名:密码@主机:端口/数据库名`

### 3.3 初始化项目目录 + 后端虚拟环境（uv）

```bash
mkdir -p movie-recommender/backend movie-recommender/frontend
cd movie-recommender
git init                        # 初始化 Git 仓库
```

后端用 **uv**（比 pip/venv 快 10 倍的包管理器）：

```bash
cd backend
uv init --bare                  # 创建 pyproject.toml（项目依赖清单）
uv venv                         # 创建虚拟环境 .venv/
uv add fastapi "uvicorn[standard]" sqlalchemy "psycopg[binary]" \
    pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" \
    apscheduler pandas scikit-learn python-multipart
```

**概念**：
- **虚拟环境（.venv）**：每个项目独立的 Python 环境，避免依赖冲突
- **pyproject.toml**：依赖清单（类似 Java 的 pom.xml）
- `uv add` 自动安装并写入清单

### 3.4 前端脚手架（Vite + React）

```bash
cd ../frontend
npm create vite@latest . -- --template react
npm install
```

**概念**：Vite 是前端构建工具，`npm create vite` 生成 React 项目骨架（类似 Spring Initializr）。

### 3.5 .gitignore（不提交的文件）

创建 `.gitignore`，排除：虚拟环境、node_modules、密钥、数据集：

```gitignore
.venv/
node_modules/
dist/
.env
data/ml-latest-small/
*.csv
```

> ⚠️ **踩坑**：pyproject.toml / uv.lock / package.json 这类**依赖清单必须第一时间 commit**。本项目曾因它们在分支切换时丢失导致 `uv add` 报错（详见 PROJECT-LOG）。

### 3.6 Git 首次提交

```bash
cd ..
git add -A
git commit -m "chore: init project"
```

**验收标准**：`git log` 能看到第一个 commit；`uv run python -c "import fastapi"` 不报错。

---

## 4. 阶段 1：UI 设计（prototype 流程）

### 4.1 为什么先做 UI 原型？

写代码前先确认「界面长什么样」——**3 个结构完全不同的变体**，用户挑一个或混搭，避免做完整套才发现方向错了。

### 4.2 设计决策（通过提问确认）

关键问题清单（每个都要用户拍板）：
1. **交互模式**：评分制（1-5 星）还是点击制（隐式反馈）？→ 本项目选**混合**：点击为主 + 评分数据冷启动
2. **用户系统**：匿名 or 注册登录？→ **注册登录**（学到认证）
3. **配色/风格**：→ 极简纯文字 + Netflix 红黑（#e50914）
4. **互动机制**：→ 喜欢 +1.0 / 收藏 +0.5 / 点赞 +0.5 可累积 / 差评 -0.5

### 4.3 前端状态设计（React 核心概念）

首页需要管理的状态（`useState`）：

```javascript
const [activeNav, setActiveNav] = useState('首页');  // 当前视图
const [query, setQuery] = useState('');              // 搜索词
const [liked, setLiked] = useState([]);              // 喜欢的电影 ID 列表
const [favs, setFavs] = useState([]);                // 收藏列表
const [likes, setLikes] = useState({});              // 点赞计数 {电影ID: 次数}
const [bads, setBads] = useState({});                // 差评计数
```

**概念**：`useState` 是 React 的「状态钩子」——数据变了，界面自动重新渲染。

### 4.4 主题系统（黑夜/白天/跟随系统）

用 CSS 变量 + `data-theme` 属性：

```javascript
const THEME_COLORS = {
  dark:  { bg: '#0f0f13', text: '#e8e8ea', red: '#e50914' },
  light: { bg: '#f5f5f0', text: '#111111', red: '#e50914' },
};
// 渲染时根据 isDark 选对应配色对象，所有组件用 colors.xxx
```

跟随系统：`window.matchMedia('(prefers-color-scheme: dark)')` 监听系统主题；手动选择存 `localStorage`（刷新不丢）。

### 4.5 互动星级机制（业务核心）

**规则**（用户拍板）：
| 操作 | 星数变化 | 限制 |
|---|---|---|
| 喜欢 | +1.0 | 一次，可取消 |
| 收藏 | +0.5 | 一次，可取消 |
| 点赞 | +0.5/次 | 不限次，可累积，点「已赞N」归零 |
| 差评 | −0.5/次 | 不限次，可累积 |

```javascript
// 最终星数 = 基础分(数据集平均分) + 互动加成
const finalScore = (m) => {
  let s = m.avg_rating ?? 0;
  if (liked.includes(m.id)) s += 1.0;
  if (favs.includes(m.id)) s += 0.5;
  s += 0.5 * (likes[m.id] || 0);
  s -= 0.5 * (bads[m.id] || 0);
  return s;
};
```

### 4.6 原型归档（prototype 规则）

原型定稿后：
- 定稿版 → **main 分支**（正式代码）
- 全部变体 → **throwaway 分支**（如 `prototype/ui-variants`），保留设计过程

```bash
git checkout -b prototype/ui-variants
git add -A && git commit -m "prototype: UI variants A/B/C/D"
git checkout main
# main 上只保留定稿代码
```

> ⚠️ **踩坑**：切换分支时未 commit 的文件会被 git 带走。确保所有文件先提交。

**验收标准**：浏览器打开页面，能切换视图、点喜欢/收藏/点赞/差评、星数实时变化、切换主题。

---

## 5. 阶段 2：后端骨架（FastAPI + PostgreSQL）

### 5.1 后端分层架构（企业级铁律）

```
backend/app/
├── main.py           # 入口：创建应用、生命周期、挂路由
├── config.py         # 配置（数据库连接、JWT 密钥）
├── database.py       # 数据库引擎 + 会话 + ORM 基类
├── models.py         # ORM 模型 = 表结构
├── schemas.py        # Pydantic = API 输入输出形状
├── security.py       # 密码哈希 + JWT
├── engine/           # 推荐引擎（可替换架构）
├── routers/          # API 路由（每个 URL 入口）
└── scheduler.py      # 定时任务
```

**分层职责（记牢）**：
- `models.py` 管「**怎么存**」（数据库表）
- `schemas.py` 管「**收什么、返什么**」（API 形状）
- `routers/` 管「**URL 业务逻辑**」
- `main.py` 只管「**装配**」

### 5.2 配置模块（config.py）

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://czx:czx@localhost:5432/movie_recommender"
    jwt_secret: str = "dev-secret-change-me"   # 生产必须换
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

settings = Settings()
```

**概念**：pydantic-settings 让配置可以用**环境变量覆盖**（上线时 `DATABASE_URL=xxx uvicorn ...` 即可，不用改代码）。

### 5.3 数据库连接（database.py）

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""

def get_db():
    """FastAPI 依赖：每个请求一个数据库会话，用完自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**概念**：
- **ORM（对象关系映射）**：用 Python 类操作数据库表，不用手写 SQL
- `get_db` 是 FastAPI **依赖注入**——路由参数写 `db: Session = Depends(get_db)` 就自动获得会话

### 5.4 ORM 模型（models.py）——5 张表

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # 绝不存明文！
    nickname: Mapped[str] = mapped_column(String(50), default="")

class Movie(Base):
    __tablename__ = "movies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # movieId
    title: Mapped[str] = mapped_column(String(255), index=True)
    genres: Mapped[str] = mapped_column(String(255))  # "Adventure|Animation|..."

class Rating(Base):  # 数据集原始评分（>=4 = 喜欢信号）
    __tablename__ = "ratings"
    id, user_id, movie_id, rating, timestamp

class ClickEvent(Base):  # 行为事件（用户互动）
    __tablename__ = "click_events"
    id, user_id, movie_id, action  # like/fav/thumbs_up/bad
    delta  # 对星数的贡献

class RecCache(Base):  # 推荐缓存（离线算好、线上查）
    __tablename__ = "rec_cache"
    id, user_id, movie_ids  # JSON 字符串
    computed_at
```

**表关系图**：
```
users ─┬─< click_events >─ movies
       └────────< ratings >──────┘
users ──< rec_cache >（用户 → 推荐列表）
```

### 5.5 入口（main.py）

```python
app = FastAPI(title="Movie Recommender API", version="0.1.0")

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)  # 自动建表（开发用）

app.include_router(health.router)
app.include_router(movies.router)
# ...
```

**概念**：`create_all` 根据 models.py 自动创建不存在的表——开发期神器，生产用 Alembic 迁移工具。

### 5.6 启动与验证

```bash
cd backend
uv run uvicorn app.main:app --port 8000 --reload
```

- `--reload`：改代码自动重启（开发期必开）
- 打开 `http://localhost:8000/docs`：**Swagger 自动文档**——FastAPI 白送的交互式 API 文档，每个接口可点击测试

**验收标准**：`curl localhost:8000/api/health` 返回 `{"status":"ok","movie_count":0}`。

---

## 6. 阶段 3：数据导入

### 6.1 数据集

MovieLens ml-latest-small：10 万评分 / 610 用户 / 9742 电影，文件在 `~/Downloads/ml-latest-small/`：
- `movies.csv`：movieId, title, genres（类型用 | 分隔）
- `ratings.csv`：userId, movieId, rating(0.5~5.0), timestamp

### 6.2 导入脚本（scripts/import_data.py）

```python
# 核心逻辑：幂等（重复跑不重复导入）
existing = set(db.scalars(select(Movie.id)).all())
with open(DATA_DIR / "movies.csv") as f:
    for row in csv.DictReader(f):
        mid = int(row["movieId"])
        if mid in existing:   # 已存在则跳过 → 幂等
            continue
        db.add(Movie(id=mid, title=row["title"], genres=row["genres"]))
```

**评分二值化**（关键设计，来自 ADR-0001）：
```python
if rating < 4.0:  # 只保留 >=4 的评分 = 「喜欢」信号
    continue
```

**概念**：
- **幂等（idempotent）**：跑 100 遍结果一样——先查重再插入
- **分批提交**（5000 条/批）：避免一次性内存过大
- **二值化**：评分 >=4 = 喜欢（1），<4 = 不喜欢（0）——显式评分转隐式反馈的标准做法

### 6.3 运行

```bash
uv run python scripts/import_data.py
# 输出：movies: 新增 9742 部 / ratings: 保留 >=4 分 48580 条
```

**验收标准**：`psql -d movie_recommender -c "SELECT count(*) FROM movies;"` 返回 9742。

---

## 7. 阶段 4：认证系统（JWT）

### 7.1 为什么需要认证？

「谁在点喜欢」必须知道——不然互动数据无法个性化。JWT（JSON Web Token）是**无状态会话**：服务器不存 session，token 本身就是「通行证」。

### 7.2 密码安全（security.py）

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)   # 加盐哈希，不可逆

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**红线**：**密码绝不存明文**。存的是 bcrypt 哈希（`$2b$12$...`），即使数据库泄露也无法还原密码。

### 7.3 JWT 签发与校验

```python
def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None   # 签名错/过期 → None
```

**概念**：JWT = `头部.载荷.签名` 三段式；签名用密钥，**伪造/篡改会被识破**。

### 7.4 注册/登录路由（routers/auth.py）

```python
@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.username == data.username))
    if exists:
        raise HTTPException(status_code=400, detail="用户名已被占用")
    user = User(username=data.username, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id, user.username), ...)

@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")  # 统一报错防枚举
    return TokenOut(access_token=create_access_token(user.id, user.username), ...)
```

**安全细节**：
- 登录失败统一报「用户名或密码错误」——不泄露「用户名不存在」还是「密码错」（防枚举攻击）
- 注册即登录（直接返回 token）

### 7.5 受保护接口（依赖注入）

```python
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials=Depends(bearer_scheme), db=Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="未登录")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="登录已过期或令牌无效")
    return db.get(User, int(payload["sub"]))
```

**用法**：任何接口加一个参数 `current_user: User = Depends(get_current_user)` 就受保护了。

### 7.6 完整测试矩阵

```bash
# 注册（201 + token）
curl -X POST localhost:8000/api/auth/register -H "Content-Type: application/json" \
  -d '{"username":"czx","password":"test1234"}'
# 重复注册（400）
# 登录（200 + token）
# 带 token 访问 /me（200）
curl localhost:8000/api/auth/me -H "Authorization: Bearer <token>"
# 无 token（401）/ 密码错（401）/ 伪造 token（401）
```

> ⚠️ **踩坑**：passlib 1.7.4 与 bcrypt 5.0 不兼容（报 `password cannot be longer than 72 bytes`）→ 修复：`uv add "bcrypt==4.0.1"`。

**验收标准**：7 项测试全过（201/400/200/200/401/401/401）。

---

## 8. 阶段 5：电影浏览 API

### 8.1 接口设计

| 接口 | 功能 | 参数 |
|---|---|---|
| `GET /api/movies` | 列表+分页 | page, page_size |
| `GET /api/movies?q=` | 搜索（标题/类型）| q |
| `GET /api/movies?genre=` | 类型筛选 | genre |
| `GET /api/movies/{id}` | 详情 | — |

### 8.2 实现要点（routers/movies.py）

```python
if q:
    pattern = f"%{q}%"
    stmt = stmt.where(or_(Movie.title.ilike(pattern), Movie.genres.ilike(pattern)))
```

**ILIKE vs LIKE**：SQL 的 LIKE 大小写敏感，ILIKE 不敏感——用户搜「inception」能命中「Inception」。

**分页 + 校验**：
```python
page: int = Query(1, ge=1),
page_size: int = Query(20, ge=1, le=100),   # 限制最大 100，防恶意大分页
```

### 8.3 避免 N+1 查询（性能关键）

**问题**：列表 20 部电影，如果每部都查一次评分聚合 = 21 次 SQL（N+1 问题）。

**解法**：子查询一次算出 + IN 批量取：

```python
rating_agg = (
    select(Rating.movie_id,
           (func.avg(Rating.rating) * 2).label("avg10"),   # 5分制×2=10分制
           func.count(Rating.id).label("cnt"))
    .group_by(Rating.movie_id).subquery()
)
# 一次性查出这批电影的聚合分
agg_rows = db.execute(rating_agg.select().where(rating_agg.c.movie_id.in_(ids))).all()
agg_map = {r.movie_id: r for r in agg_rows}
```

> ⚠️ **踩坑**：无人评分的电影 `agg_map.get(m.id)` 返回 None → 必须判空（`agg_row is not None`），否则 500。测试要覆盖「空数据」场景！

**验收标准**：列表/搜索/筛选/详情 4 接口全通，含无人评分电影不报错。

---

## 9. 阶段 6：行为事件 API

### 9.1 设计：事件流模式

用户每次互动 = 一条记录（事件流），而不是更新一个「计数字段」：

| 接口 | 功能 |
|---|---|
| `POST /api/events` | 记录一次互动（like/fav/thumbs_up/bad）|
| `DELETE /api/events/{movie_id}?action=` | 取消互动 |
| `GET /api/events/my` | 我的互动汇总 |

**为什么事件流**：可追溯（知道什么时候点的）、可重算（改权重后能重新计算）、可审计（银行流水同思路）。

### 9.2 幂等设计（like/fav）

```python
if data.action in ("like", "fav"):
    # 先删旧的再插入 → 同一电影同一动作永远只有一条（toggle 语义）
    db.execute(delete(ClickEvent).where(
        ClickEvent.user_id == current_user.id,
        ClickEvent.movie_id == data.movie_id,
        ClickEvent.action == data.action,
    ))
```

### 9.3 互动 → 星数映射

```python
ACTION_DELTA = {
    "like": 1.0,       # 喜欢：一次，可取消
    "fav": 0.5,        # 收藏：一次，可取消
    "thumbs_up": 0.5,  # 点赞：可累积多次
    "bad": -0.5,       # 差评：可累积多次
}
```

**delta 存表**：即使以后前端改了规则，历史数据仍可解释。

**验收标准**：9 项测试全过（401 保护/累积/幂等/取消/汇总）。

---

## 10. 阶段 7：推荐引擎（ItemCF）

### 10.1 算法原理（本项目核心！）

**ItemCF（Item-based Collaborative Filtering）**：

```
物以类聚：
1. 构建「用户-电影」矩阵（行=用户，列=电影，值=1 表示喜欢）
2. 电影向量 = 哪些用户喜欢它 → 算余弦相似度 → 电影间相似度
3. 推荐 = 你喜欢的电影的相似电影，加权汇总，排除已看过的
```

### 10.2 可替换引擎架构（ADR-0004）

```python
# engine/base.py —— 接口（抽象）
class RecommendationEngine(ABC):
    @abstractmethod
    def recommend(self, user_id: int, limit: int = 10) -> Sequence[int]: ...

# engine/itemcf.py —— 实现
class ItemCFEngine(RecommendationEngine):
    def recommend(self, user_id, limit=10):
        ...
```

**为什么抽象**：以后换向量召回/双塔模型，只需实现接口，上层路由不用改。

### 10.3 核心实现（itemcf.py）

```python
# 1. 构建稀疏矩阵
matrix = sparse.csr_matrix((data, (row, col)), shape=(n_users, n_movies))

# 2. 余弦相似度（sklearn 一行）
self._sim = cosine_similarity(matrix.T)   # 电影×电影

# 3. 加权推荐
for liked_id, w in weights.items():       # 我喜欢的每部电影
    sim_col = self._sim[:, col]           # 它的相似度列
    top_idx = np.argsort(sim_col)[-TOP_SIM:]  # 最相似的 30 个
    for idx in top_idx:
        cand_id = self._movie_ids[idx]
        if cand_id in watched_ids: continue   # 排除已互动
        scores[cand_id] += sim_col[idx] * w   # 相似度 × 权重
```

**权重设计**：like 2.0 / fav 1.0 / thumbs_up 1.0 / bad -2.0——喜欢权重最重，差评拉黑。

### 10.4 冷启动

```python
if not events:   # 无互动用户
    # 推荐全局平均分最高的电影（热门兜底）
    return [r[0] for r in db.execute(
        select(Rating.movie_id, func.avg(Rating.rating))
        .group_by(Rating.movie_id)
        .order_by(func.avg(Rating.rating).desc()).limit(limit)).all()]
```

**懒加载缓存**：相似度矩阵首次调用才计算（几秒），之后内存复用。

> ⚠️ **踩坑**：冷门电影（评分人数 <10）向量稀疏，余弦相似度噪声极大——测试要选热门样本（如《黑客帝国》222 人评分）。

**验收标准**：用户喜欢《黑客帝国》+《终结者2》→ 推荐星战系列/终结者1984/异形（同类高质量推荐）。

---

## 11. 阶段 8：定时重算 + 缓存

### 11.1 为什么定时重算？（ADR-0003）

推荐不能每次请求都现算（慢）——**离线算好、线上查**（餐厅备菜模式）：

```
用户点击/点赞/差评 → click_events 表
        ↓ 每 5 分钟（APScheduler）
全量重算推荐 → rec_cache 表
        ↓ 用户请求
/api/recommendations 读缓存返回（毫秒级）
```

### 11.2 调度器（scheduler.py）

```python
from apscheduler.schedulers.background import BackgroundScheduler
scheduler = BackgroundScheduler()

def recompute_all_recommendations():
    with SessionLocal() as db:
        db.execute(delete(RecCache))        # 清空旧缓存
        for uid in db.scalars(select(User.id)).all():
            movie_ids = engine.recommend(uid, limit=20)
            if movie_ids:
                db.add(RecCache(user_id=uid, movie_ids=json.dumps(movie_ids)))
        db.commit()
```

### 11.3 应用生命周期（main.py lifespan）

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(recompute_all_recommendations, trigger="interval", minutes=5)
    scheduler.start()
    recompute_all_recommendations()   # 启动先算一次，避免无缓存
    yield
    scheduler.shutdown()
```

**概念**：lifespan 是 FastAPI 管理启动/关闭钩子的现代方式（替代废弃的 @app.on_event）。

### 11.4 接口读缓存（兜底现算）

```python
cached = db.scalar(select(RecCache).where(RecCache.user_id == current_user.id))
if cached is not None:
    movie_ids = json.loads(cached.movie_ids)[:limit]   # 读缓存
else:
    movie_ids = engine.recommend(...)                   # 兜底现算
    db.add(RecCache(...))                               # 顺手写缓存
```

**验收标准**：启动日志「定时任务已启动」「推荐重算完成」；rec_cache 表有数据；接口返回与缓存一致。

---

## 12. 阶段 9：前端全链路联调

### 12.1 Vite 代理（解决 CORS）

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
```

**概念**：浏览器只认识 5173，前端请求 `/api/*` 由 Vite 转发到 8000——**同源，没有跨域问题**。生产用 Nginx 反向代理做同样的事。

### 12.2 API 封装（api.js）

```javascript
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;   // 自动带 token
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `请求失败 (${res.status})`);
  }
  return res.json();
}
```

### 12.3 登录态路由（main.jsx）

```javascript
function App() {
  const [user, setUser] = useState(() => getToken() ? { username: '' } : null);
  if (!user) return <AuthPage onAuthed={setUser} />;   // 未登录 → 登录页
  return <Home user={user} onLogout={handleLogout} />;  // 已登录 → 首页
}
```

### 12.4 useEffect 数据请求（+ 竞态保护）

```javascript
useEffect(() => {
  let cancelled = false;   // 竞态保护
  fetchRecommendations(20)
    .then((data) => { if (!cancelled) setRecs(data); })
    .catch((e) => { if (!cancelled) setError(e.message); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };   // 清理函数
}, [activeNav]);   // 依赖变化 → 重新请求
```

> ⚠️ **踩坑**：没有 cancelled 标志，快速切换时旧响应会覆盖新响应（显示过期数据）。必须用「清理函数 + 标志位」。

### 12.5 乐观更新 + 失败回滚

```javascript
const toggleLike = async (id) => {
  const isOn = liked.includes(id);
  setLiked(prev => isOn ? prev.filter(x => x !== id) : [...prev, id]);  // 先改 UI（乐观）
  try {
    if (isOn) await deleteEvents(id, 'like');
    else await postEvent(id, 'like');
  } catch (e) {
    setLiked(prev => isOn ? [...prev, id] : prev.filter(x => x !== id));  // 失败回滚
    alert(e.message);
  }
};
```

**概念**：乐观更新 = 先让用户看到结果，后台同步；失败再回滚——体验好（不用等网络）。

### 12.6 全链路 e2e 验证

```
注册 → 冷启动推荐（热门兜底）→ 点喜欢 2 部科幻片 → 定时重算
→ 推荐变成科幻片（星战/终结者）→ 刷新页面 → 互动状态恢复 ✅
```

**验收标准**：完整闭环——**点击学习 → 定时重算 → 推荐更新**。

---

## 13. 面试考点总结

做完这个项目，你能回答这些面试题：

### 推荐系统方向
1. **讲一下 ItemCF 原理？** → 物以类聚：用户-电影矩阵 → 余弦相似度 → 加权推荐
2. **冷启动怎么解决？** → 无行为用户推荐热门/高分（本项目）；工业界还有注册问卷、地域推荐
3. **UserCF vs ItemCF？** → UserCF 找相似的人（社交场景好），ItemCF 找相似的物（电商/视频好，可离线预计算）
4. **N+1 查询是什么？怎么解决？** → 逐条查详情；子查询 + IN 批量
5. **离线算 + 线上查 的模式？** → 定时重算缓存，接口读缓存
6. **为什么推荐结果要排除已看过的？** → 用户已经知道的东西没有推荐价值（探索 vs 利用）

### 后端方向
7. **JWT 认证流程？** → 登录发 token → 前端存 localStorage → 请求带 Authorization → 后端验签
8. **为什么密码要哈希？** → 数据库泄露也无法还原；bcrypt 自动加盐防彩虹表
9. **幂等设计？** → 重复请求结果一致：先查重再插入 / 先删后插
10. **CORS 怎么解决？** → 开发期 Vite 代理；生产 Nginx 反代 / 后端加 CORS 中间件

### 前端方向
11. **useEffect 竞态？** → 快速切换时旧响应覆盖新响应；cancelled 标志 + 清理函数
12. **乐观更新？** → 先改 UI 后请求，失败回滚

### 项目经历描述（STAR 法则）
> 「我独立开发了一个电影推荐网站：React 前端 + FastAPI 后端 + PostgreSQL。实现了 JWT 认证、互动行为记录、ItemCF 协同过滤推荐引擎（余弦相似度 + 冷启动兜底），并用 APScheduler 每 5 分钟定时重算推荐写入缓存。过程中解决了 N+1 查询、useEffect 竞态、passlib 兼容等 6 个实际问题。项目代码和文档在 GitHub（czx-beauty/czx-beauty）。」

---

## 14. 扩展方向

项目架构已为以下扩展预留位置：

### 方向 1：换推荐引擎（算法线）
实现 `RecommendationEngine` 接口 → **向量召回**（Word2Vec 学电影 embedding + FAISS 检索）或**双塔模型**（PyTorch）——不改上层代码。

### 方向 2：补测试（工程线）
```bash
cd backend && uv add pytest httpx
# 用 FastAPI TestClient 写：认证流程 / 电影 API / 事件 API / 推荐接口
```

### 方向 3：部署上线
- Docker 容器化（backend + frontend + PostgreSQL 三容器）
- 部署腾讯云（你问过的云平台实战）
- 环境变量管理密钥、HTTPS、Alembic 数据库迁移

### 方向 4：功能增强
- 电影详情页（已有 API）、分页加载、无限滚动
- 用户互相关注、评论
- 排行榜、管理后台

### 方向 5：数据增强
- 换更大数据集（ml-latest 全量，2700 万评分）
- 加 tags.csv（用户标签 → 内容特征）

---

## 附：学习建议（重要）

1. **动手 > 阅读**：每个阶段都有「验收标准」，跑通再前进
2. **先跑通再优化**：先实现简单版本，再考虑性能/扩展
3. **踩坑是最快的老师**：本项目的 6 个坑（PROJECT-LOG 里有详细记录）都是真实项目经验
4. **面试讲项目**：用 STAR 法则讲你做过的项目，比背八股文有用 10 倍
5. **持续迭代**：推荐系统是活系统——用户行为 → 重算 → 推荐 → 新行为，永远在进化

> 完整开发过程（含每个决策的原因、每次报错的处理）：见 `docs/PROJECT-LOG.md`
