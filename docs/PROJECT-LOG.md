# 项目过程日志（PROJECT LOG）

> 规则：本项目（czx-beauty 电影推荐网站）的构建过程 + 常大人的疑问与解答，全部实时记录在这里。
> 项目完成（T10）后停止更新。

## 2026-08-18

### 项目启动（Grill + Docs 阶段）

**决策确认**（详见 docs/adr/0001~0004）：
- 混合推荐路线：点击（隐式反馈）+ 评分初始化（显式数据冷启动）
- 用户系统：注册登录（用户名+密码，JWT）
- 技术栈：FastAPI + React/Vite + PostgreSQL（用户只学过 MySQL，PostgreSQL 与其 95% 兼容，属免费升级）
- 推荐引擎 v1：ItemCF 协同过滤（评分二值化 >=4 为喜欢）
- 更新机制：行为事件入库 + APScheduler 每 5 分钟重算 + 缓存读取
- 功能范围：登录/注册、首页推荐流、详情、搜索、类型筛选、我的喜好
- 数据：ml-latest-small 自动导入（幂等）
- Git：仓库名 `czx-beauty`，每阶段 commit

**环境事实**：
- 数据集 3.2MB：100836 评分 / 610 用户 / 9724 电影 / 评分分布 4.0 最多
- 本机 Node 22 / npm 10 / uv / Homebrew / Docker 可用
- 本机直连 GitHub 超时 → 必须走代理 `HTTPS_PROXY=http://127.0.0.1:7897`
- SSH key 已配置（czx-beauty），gh CLI 已登录

### 用户疑问记录

**Q1：AWS/GCP 和腾讯云是什么？** → 都是云平台（租服务器+存储+服务），国内用腾讯云更实际；ML 学习阶段用不上，训练大模型和部署才需要。

**Q2：CI/CD 是什么？** → 自动化流水线：CI=提交代码自动测试，CD=自动部署上线；ML 场景叫 MLOps。

**Q3：MLflow/W&B 跟踪实验是什么意思？** → 自动记录每次实验的超参数/指标/模型，网页对比；`wandb.log()` 两行代码。

**Q4：RAG 和 eval 是什么？** → RAG=检索增强生成（先查资料库再让模型答，开卷考试）；eval=评估（用分数量化效果）；RAG 应用必须配 eval。

**Q5：CNN/RNN/LLM 的区别？** → CNN 图像（卷积核扫图）、RNN 序列（有记忆）、LLM 文本（注意力看全局）；演进关系：RNN 被 Transformer 取代。

**Q6：LSTM 是什么？** → RNN 升级版，三道门（遗忘/输入/输出）解决记不住长句；现在 NLP 被 Transformer 取代，时序预测仍常用。

**Q7：单头 vs 多头注意力？** → 单头=一个视角（一个人审案），多头=多组专家并行各学一种关系（指代/语法/场景）；embed_dim 必须被 num_heads 整除。

**Q8：Word2Vec/GloVe？** → 词嵌入：相近的词向量相近；Word2Vec 局部窗口（朋友圈观察），GloVe 全局共现统计；被 BERT 上下文向量取代但面试必考。

**Q9：推荐算法怎么实现？** → 召回（海选）→ 排序（精挑）→ 重排（微调）；万物皆向量，相似度匹配。

**Q10：算法难在哪？为什么有壁垒？** → 普通软件=确定逻辑（数学题），算法=不确定试错（中医）；壁垒=经验积累（数据/工程/人才），不是工具本身（框架都开源）。

**Q11：代码包装成接口后网页怎么调用？** → 四角色：前端（展示+请求）/后端（调算法）/数据库/算法；接口=URL 菜单；前端永远不直接碰算法。

**Q12：有了 CONTEXT.md 为什么还要 AGENTS.md？** → CONTEXT.md=词典（术语标准），AGENTS.md=员工手册（工作流程）；管「说什么」vs「怎么做事」。

**Q13：GitHub 授权失败（直连超时）？** → 深圳直连 GitHub 被墙，走 Clash 代理（127.0.0.1:7897）后成功 `✓ Logged in as czx-beauty`。

**Q14：gh 未登录但 SSH 已通？** → SSH key 与 gh CLI 是两套凭证；SSH 用于 push，gh 用于 API（建仓库/发 issue），都需要单独配置。

**Q15：PostgreSQL 没学过？** → 与 MySQL 95% 兼容，SQL 语法通用；功能更强（JSON/全文检索），属免费升级。

### Tickets 拆分（to-tickets）

用户要求**前端优先** → 10 张卡，T1 前端基建 → T2 前端全部页面（mock 数据）→ T3~T8 后端 → T9 联调 → T10 收尾。
（已确认，发布待执行）

### Prototype 阶段（进行中）

- 任务：3 个结构不同的首页 UI 变体（?variant= 切换 + 底部浮条）
- 后端环境：uv venv + uv add（fastapi/uvicorn/sqlalchemy/psycopg/pandas/scikit-learn/apscheduler 等 ✅）
- 前端脚手架：Vite + React ✅

### UI 原型迭代（grill-me 多轮拷问）

**变体 A/B/C**：Netflix 横滚式 / 卡片瀑布流 / 极简侧边栏，底部浮条切换。

**用户反馈驱动的迭代**：
1. 纯文字界面无图标；无「晚上好」类消遣文案；选变体 C 布局；Netflix 红黑配色（#e50914 + 黑底白字）
2. 侧边栏可收起（先细边后改**完全消失 + ☰ 图标**）、可拖拽调宽（200-400px）、黑夜/白天/跟随系统三主题（localStorage 记忆）
3. 搜索框放顶部；点击卡片=喜欢/取消
4. **互动星级机制**：喜欢+1.0（一次可取消）、收藏+0.5（一次可取消）、点赞+0.5/次（**可连续累积**，点「已赞N」归零）、差评-0.5/次（同上）；显示「赞 N · 差 N」
5. 设置页充实：外观/昵称修改/修改密码/退出登录/账号详情
6. 切换视图时侧边栏保持打开（不自动关），仅「关闭」按钮收起

**Bug 修复记录**：Star 组件 `'☆'.repeat(5-n)` 在 10 分制评分（9.3）下崩溃（RangeError: -4）→ clamp 0~5 + 除以 2 折算。教训：**数据格式与组件假设不一致**是常见崩溃源，组件需防御性处理。

**定稿（implement 阶段）**：
- Variant D v3 定稿为正式首页 `src/Home.jsx`，移除变体切换器
- 原型（A/B/C/D 全变体）归档到分支 `prototype/ui-variants`（prototype 规则：原型进分支不进 main）
- 踩坑：切回 main 时 prototype 分支已跟踪的 frontend 文件被 git 带走 → 从分支选择性恢复基础文件（package.json/index.html/vite.config.js/mockData.js）
- main 提交 `720e609`：正式首页 + 互动星级机制

### T3 后端骨架（PostgreSQL + FastAPI + 数据导入）——详细过程

**阶段目标**：搭起企业级后端：数据库装/启动/建库 → ORM 建表 → FastAPI 路由 → CSV 数据导入。验收 = `/api/health` 返回电影数。

**Step 1：装 PostgreSQL 16**（brew）
- `brew install postgresql@16`（后台 ~1 分钟，装完自动 initdb 初始化数据集群）
- `brew services start postgresql@16` 启动服务（开机自启）
- `pg_isready` → `/tmp:5432 - 接受连接` ✅

**Step 2：建用户和数据库**
- `CREATE USER czx WITH PASSWORD 'czx'`（开发用简单密码；生产必须强密码+环境变量）
- `CREATE DATABASE movie_recommender OWNER czx`
- 连接串：`postgresql+psycopg://czx:czx@localhost:5432/movie_recommender`（存在 config.py）

**Step 3：后端分层架构**（企业级铁律，每个 FastAPI 项目通用）
```
backend/
├── pyproject.toml        # uv 依赖清单
├── app/
│   ├── main.py           # 入口：创建应用、startup 建表、挂路由
│   ├── config.py         # 配置（pydantic-settings，环境变量可覆盖）
│   ├── database.py       # 引擎 + 会话 + Base（SQLAlchemy 2.0 风格）
│   ├── models.py         # ORM 模型 = 表结构
│   ├── schemas.py        # Pydantic = API 输入输出形状
│   └── routers/
│       └── health.py     # 健康检查路由
└── scripts/
    └── import_data.py    # CSV → 数据库（幂等）
```
分层职责：models.py 管「怎么存」，schemas.py 管「收什么返什么」，routers 管「URL 业务」，main.py 只管装配。互不混淆。

**Step 4：ORM 模型**（5 张表，对应 CONTEXT.md 领域词汇）
| 表 | 领域词汇 | 说明 |
|---|---|---|
| users | 用户 | 注册登录，密码 bcrypt 哈希 |
| movies | 电影 | movieId/title/genres（genres 用 | 分隔的字符串）|
| ratings | 评分 | 数据集原始评分，**只导 >=4 的**（ADR-0001 二值化=喜欢信号）|
| click_events | 行为事件 | 网站用户互动记录（like/fav/thumbs_up/bad + delta）|
| rec_cache | 推荐缓存 | 定时重算的「用户→推荐列表」（JSON 字符串）|

**Step 5：数据导入脚本**（幂等设计）
- movies.csv 全量导入（9742 部）；ratings.csv 10 万条中只保留 >=4 分的 48580 条
- 幂等：先查已存在的 movieId 再插，重复跑不重复
- 分批提交（5000 条/批），避免内存爆炸
- 运行：`uv run python scripts/import_data.py`

**Step 6：验收结果**
- 导入：`movies: 新增 9742 部`、`ratings: 保留 >=4 分 48580 条` ✅
- `/api/health` → `{"status":"ok","movie_count":9742}` ✅
- `/docs` Swagger 自动文档 ✅（FastAPI 白送）

**教学要点**：
1. ORM（SQLAlchemy）让你用 Python 对象操作数据库，不用手写 SQL；但底层还是 SQL
2. Pydantic 负责 API 数据校验和序列化，和 ORM 分离是标准做法
3. 幂等脚本 = 跑 100 遍结果一样，这是工程化基本要求
4. 密码绝不存明文（bcrypt 哈希）——安全红线
5. 编辑器报「sqlalchemy 无法解析」是因为没指向 venv，用 `uv run` 执行即正常

### T5 电影浏览 API（列表/搜索/筛选/详情）——详细过程

**阶段目标**：让前端首页的电影流换成真实数据（9742 部）。4 个接口全部走通。

**接口设计**（routers/movies.py）：
| 接口 | 功能 | 首页对应 |
|---|---|---|
| GET /api/movies | 列表+分页（page/page_size）| 首页流 |
| GET /api/movies?q= | 搜索（标题/类型，ILIKE 模糊）| 顶部搜索框 |
| GET /api/movies?genre= | 类型筛选 | 分类浏览 |
| GET /api/movies/{id} | 详情（含 avg_rating/rating_count 聚合）| 详情页 |

**教学要点**：
1. **ILIKE vs LIKE**：SQL 的 LIKE 大小写敏感，ILIKE 不敏感——用户搜「inception」能命中「Inception」
2. **分页**：`offset + limit`，page/page_size 参数带校验（ge=1/le=100），防止恶意大分页
3. **聚合查询**：`func.avg()/func.count()` 一次 SQL 算出平均分和人数，不用在 Python 里算
4. **404 处理**：`HTTPException(status_code=404)` 是 REST 规范，前端能区分「没有」和「出错」
5. **响应模型**：`response_model=` 声明返回形状，Pydantic 自动校验+序列化，还能在 Swagger 显示

**验收结果**：
- 列表 total=9742 ✅ / 搜索 inception 命中 1 部 ✅ / Sci-Fi 筛选 980 部 ✅ / 详情 Toy Story avg 4.38·147 人 ✅
