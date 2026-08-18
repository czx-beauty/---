# 电影推荐网站（movie-recommender）

企业级架构的电影推荐学习项目：**通过点击电影学习喜好，定时重算个性化推荐**（ItemCF 协同过滤）。

![tech](https://img.shields.io/badge/FastAPI-0.141-009688) ![react](https://img.shields.io/badge/React-18-61dafb) ![pg](https://img.shields.io/badge/PostgreSQL-16-336791) ![python](https://img.shields.io/badge/Python-3.11-3776AB)

## 功能

- 🔐 **注册/登录**：JWT 认证，bcrypt 密码哈希
- 🎬 **电影浏览**：9742 部真实电影（MovieLens），搜索/类型筛选/分页
- ⭐ **互动星级机制**：喜欢 +1.0 / 收藏 +0.5 / 点赞 +0.5(可累积) / 差评 -0.5，实时算分
- 🧠 **个性化推荐**：ItemCF 协同过滤（余弦相似度），每 5 分钟定时重算，缓存读取
- 🌗 **双主题**：黑夜/白天/跟随系统，侧边栏可收起可拖拽调宽
- 📊 **五个视图**：首页(推荐流)/热门/我的片单/收藏/设置

## 架构

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
                │ SQLAlchemy
┌───────────────▼─────────────────────────────────┐
│ PostgreSQL 16 (movie_recommender 库)             │
│  users / movies / ratings / click_events /       │
│  rec_cache                                       │
└─────────────────────────────────────────────────┘
```

**推荐流程**（ADR-0003：离线算 + 线上查）：
```
用户点击/点赞/差评 → click_events 表
        ↓ 每 5 分钟（APScheduler）
全量重算推荐 → rec_cache 表
        ↓ 用户请求
/api/recommendations 读缓存返回（毫秒级）
```

## 快速开始

### 1. 数据库（PostgreSQL 16）
```bash
brew install postgresql@16
brew services start postgresql@16
psql -d postgres -c "CREATE USER czx WITH PASSWORD 'czx';"
psql -d postgres -c "CREATE DATABASE movie_recommender OWNER czx;"
```

### 2. 后端（uv）
```bash
cd backend
uv sync                      # 装依赖
uv run python scripts/import_data.py   # 导入 MovieLens 数据（幂等）
uv run uvicorn app.main:app --port 8000 --reload
```
- API 文档（Swagger）：http://localhost:8000/docs

### 3. 前端
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | React 18 + Vite | 组件化 SPA，Vite 代理解决 CORS |
| 后端 | FastAPI + SQLAlchemy 2.0 | 分层架构（routers/models/schemas）|
| 认证 | JWT (python-jose) + bcrypt | 无状态会话，密码哈希 |
| 数据库 | PostgreSQL 16 | 5 张表（users/movies/ratings/click_events/rec_cache）|
| 推荐 | scikit-learn 余弦相似度 | ItemCF 协同过滤，引擎接口可替换 |
| 调度 | APScheduler | 每 5 分钟全量重算推荐 |
| 环境 | uv + Node 22 | 现代包管理 |

## 项目结构

```
movie-recommender/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI 入口（lifespan + 挂路由）
│   │   ├── config.py          # 配置（环境变量）
│   │   ├── database.py        # 引擎/会话/Base
│   │   ├── models.py          # ORM 模型（5 张表）
│   │   ├── schemas.py         # Pydantic 输入输出
│   │   ├── security.py        # 密码哈希 + JWT
│   │   ├── engine/            # 推荐引擎（可替换架构）
│   │   │   ├── base.py        #   RecommendationEngine 接口
│   │   │   └── itemcf.py      #   ItemCF 实现
│   │   ├── routers/           # API 路由
│   │   └── scheduler.py       # APScheduler 定时重算
│   └── scripts/import_data.py # CSV 幂等导入
├── frontend/
│   └── src/
│       ├── main.jsx           # 登录态路由
│       ├── AuthPage.jsx       # 登录/注册
│       ├── Home.jsx           # 首页（五视图 + 互动）
│       └── api.js             # API 封装
├── docs/
│   ├── adr/                   # 架构决策记录（0001~0004）
│   ├── agents/                # agent 工作约定
│   ├── spec-movie-recommender.md  # 项目 spec
│   └── PROJECT-LOG.md         # 完整开发过程日志（含踩坑）
├── CONTEXT.md                 # 领域词汇表
└── AGENTS.md
```

## 学习路径映射

| 学到的东西 | 对应实现 |
|---|---|
| 词嵌入/向量思想 | 电影向量化 + 余弦相似度（itemcf.py）|
| 协同过滤 | ItemCF：物以类聚 |
| REST API 设计 | routers/（列表/详情/增删/认证）|
| 数据库建模 | models.py 5 张表 |
| 认证安全 | JWT + bcrypt + 401 保护 |
| 缓存模式 | rec_cache：离线算+线上查 |
| 定时任务 | APScheduler |
| 前端工程 | React 组件化 + 状态管理 + 乐观更新 |
