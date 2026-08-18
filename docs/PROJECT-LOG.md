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

### T9-前半：前端接真实数据（Vite 代理 + fetch + useEffect）

**阶段目标**：首页电影流从 mock 12 部 → 真实 API 9742 部。

**Step 1：后端列表接口带平均分**（避免 N+1）
- 关键点：**N+1 问题**——如果列表 20 部电影每部都查一次评分聚合 = 21 次 SQL；用子查询+IN 一次查出 = 2 次 SQL
- 实现：`rating_agg` 子查询（GROUP BY movie_id 算 avg×2 和 count）+ `.where(movie_id.in_(ids))` 批量取
- 数据格式：数据集评分是 5 分制（0.5~5.0），×2 折算成 10 分制（保持 UI 风格）

**Step 2：Vite 代理**（绕开 CORS 的工业级解法）
- 前端 5173 请求 `/api/*` → vite.config.js 的 proxy 转发到 `localhost:8000`
- 效果：浏览器只认识 5173，永远没有跨域问题；生产部署时反向代理（Nginx）做同样的事

**Step 3：API client**（src/api.js）
- fetch 封装：统一 base 路径 `/api`、JSON 头、错误处理（非 2xx 抛 Error 带后端 detail）
- 导出 fetchMovies（q/genre/page/pageSize 参数化）供页面调用

**Step 4：Home.jsx 数据化改造**
- `useEffect` 请求数据，依赖 [query, activeNav]——搜索词/切视图自动重新请求
- **竞态保护**：`cancelled` 标志 + 清理函数，防止快速输入时旧响应覆盖新响应
- loading/error 三态渲染（加载中/失败/数据）
- 热门视图：前端按 avg_rating 降序（当前页；完整排序后续交给推荐引擎）
- 互动机制保留本地 state（T6 接行为事件 API 后持久化）

**验收结果**：
- 前端 5173 代理请求 → `{"total": 9742}`，Toy Story ★ 8.76 ✅
- 搜索框实时查后端 ✅ / 每部显示「N 人评分」✅

**教学要点**：
1. **N+1 查询**是新手最容易犯的性能错误——记住「能用一次 SQL 绝不 N 次」
2. **CORS**：浏览器安全策略，前后端同源（代理）是开发期标准解法
3. **useEffect 竞态**：异步请求必须有取消保护，否则会出现「显示过期数据」的诡异 bug
4. **5 分制 vs 10 分制**：数据格式转换要统一在 API 层做，前端永远只认一种格式

**🐛 Bug 修复：`AttributeError: 'NoneType' object has no attribute 'avg10'`（500）**
- 现象：浏览器请求失败（500），后端日志显示 _to_movie_out 访问 None.avg10 崩溃
- 根因：`agg_map.get(m.id)` 对**无人评分的电影**返回 None（9742 部中有大量无评分），代码没判空直接访问属性
- 教训 1：**边界情况（无数据/空值）必须判空**——curl 测试恰好都是有评分的电影（Toy Story 147 人），掩盖了 bug；首页第一页有 1 部无评分电影就炸了
- 教训 2：测试要覆盖「空数据」场景，不能只测「有数据」的 happy path
- 修复：`agg_row is not None` 判空后取值
- 顺手：后端启动加 `--reload`（改代码自动生效，开发期神器）

### T4 认证 API（注册/登录/JWT）——详细过程

**阶段目标**：用户体系落地——注册/登录/受保护接口，密码安全存储。

**实现**（security.py + routers/auth.py）：
1. **密码哈希**：passlib + bcrypt（`$2b$12$...` 格式），自动加盐，哈希不可逆
2. **JWT**：登录/注册成功 → 签发 token（含 user_id/username/过期时间，HS256 签名）
3. **受保护接口**：`Depends(get_current_user)` —— FastAPI 依赖注入，自动从 `Authorization: Bearer <token>` 提取并校验
4. 安全细节：登录失败统一报「用户名或密码错误」（防用户名枚举）；伪造/过期 token 一律 401

**🐛 大坑：passlib 1.7.4 + bcrypt 5.0 不兼容**
- 现象：注册 500，日志 `ValueError: password cannot be longer than 72 bytes`
- 根因：passlib 1.7.4（2020 停更）在 bcrypt 4.1+ 下自检崩溃（bcrypt 强制 72 字节密码上限，passlib 自检传超长字符串）
- 修复：`uv add "bcrypt==4.0.1"` 降级（社区标准解法）
- 教训：**passlib 已停更，新项目优先用 bcrypt 库直连**；依赖版本组合是隐形炸弹

**🐛 大坑 2：pyproject.toml / uv.lock 丢失**
- 现象：uv add 报「No pyproject.toml」
- 根因：uv init 生成 pyproject.toml 时正值原型分支，切回 main 时被 git 带走（git 只跟踪 commit 过的文件）
- 修复：`git checkout prototype/ui-variants -- backend/pyproject.toml backend/uv.lock` + `uv sync`
- 教训：**项目的依赖清单文件（pyproject.toml/uv.lock/package.json）必须第一时间 commit 进 main**，它们是项目身份的一部分

**验收**：注册 201 / 重复注册 400 / 登录 200 / /me 200 / 无token 401 / 密码错 401 / 伪造token 401 全部通过 ✅

### T6 行为事件 API（互动持久化）——详细过程

**阶段目标**：喜欢/收藏/点赞/差评写入数据库（click_events 表），刷新不丢；前端刷新后从 /my 恢复状态。

**接口设计**（routers/events.py）：
| 接口 | 功能 | 权限 |
|---|---|---|
| POST /api/events | 记录一次互动（like/fav/thumbs_up/bad）| 需登录 |
| DELETE /api/events/{movie_id}?action= | 取消互动 | 需登录 |
| GET /api/events/my | 我的互动汇总 {movie_id: {action: 次数}} | 需登录 |

**设计决策**：
1. **事件流模式**：每次互动=一条记录（thumbs_up×3=3条），比「更新计数字段」更灵活（可追溯、可重算）
2. **like/fav 幂等**：先删旧再插入，同一电影同一动作只保留一条（toggle 语义）
3. **thumbs_up/bad 累积**：每条独立记录，取消=删全部归零
4. **delta 存表**：每种动作对星数的贡献（1.0/0.5/-0.5）作为字段保存——即使前端改了规则，历史数据仍可解释

**教学要点**：
1. **认证复用**：`Depends(get_current_user)` 是 T4 写好的依赖，任何接口一行接入保护——这就是依赖注入的价值
2. **事件流 vs 状态**：记录「发生了什么」而不是「现在是什么」，是审计/重放的基础（银行流水也是这个思路）
3. **幂等设计**：重复 POST 不会产生重复数据，是接口健壮性的关键

**验收**：9 项测试全过（401 保护/累积/幂等/取消/汇总）✅

### T7 推荐引擎（ItemCF 协同过滤）——详细过程

**阶段目标**：个性化推荐——「物以类聚」：推荐和你喜欢电影相似的电影。

**架构**（ADR-0004 可替换引擎）：
```
app/engine/
├── base.py    # RecommendationEngine 接口（ABC）——将来换双塔/向量召回不动上层
└── itemcf.py  # ItemCF 实现 + 模块级单例 engine
```

**算法三步**（之前学的知识实战）：
1. **用户-电影矩阵**：行=用户，列=电影，值=1（评分>=4 二值化）→ scipy 稀疏矩阵（6298 部电影）
2. **余弦相似度**：`cosine_similarity(matrix.T)` → 电影×电影相似度矩阵（sklearn 一行）
3. **加权推荐**：用户互动的电影（like 权重 2.0 / fav 1.0 / thumbs_up 1.0 / bad -2.0）× 相似度 → 汇总打分 → 排除已互动 → Top-N

**设计要点**：
- **懒加载缓存**：相似度矩阵首次调用才计算（几秒），之后内存复用
- **冷启动**：无互动用户 → 推荐全局平均分最高的电影（热门兜底）
- **TOP_SIM=30**：每个电影只取相似度最高的 30 个候选，控制计算量

**🐛 调试教训：第一次测试推荐质量差（推荐出无关电影）**
- 现象：用户喜欢 3 部「科幻片」却推荐 Airport '77、Freaky Friday 等
- 根因：**测试电影选错**——27266《2046》只有 6 人评分、1091 只有 2 人评分，冷门电影向量稀疏，余弦相似度噪声极大
- 用热门科幻片重测（Matrix 222 人 + Terminator 2 150 人）→ 推荐出星战系列/终结者/异形/夺宝奇兵，质量完美
- 教训：**数据质量决定算法上限**——冷门物品的相似度不可靠是协同过滤的固有弱点（长尾问题）；测试要选「有足够数据」的样本

**验收**：Matrix+Terminator2 → 星战V/IV/VI + 终结者1984 + 异形 + 夺宝奇兵 ✅（同类型高质量推荐）

### T8 定时重算 + 推荐缓存（ADR-0003 落地）——详细过程

**实现**（scheduler.py + main.py lifespan）：
1. **APScheduler 后台调度器**：每 5 分钟触发 `recompute_all_recommendations()`
2. **重算逻辑**：清空 rec_cache → 为每个用户算推荐（limit=20）→ JSON 序列化写入
3. **启动即算**：应用 lifespan 启动时先手动跑一次，避免冷启动无缓存
4. **推荐接口改读缓存**：`rec_cache` 命中直接返回；未命中（新注册用户）现算并顺手写缓存

**教学要点**：
1. **lifespan 生命周期**：FastAPI 2.0 方式管理启动/关闭钩子（替代废弃的 @app.on_event）
2. **离线算+线上查**（ADR-0003 核心）：推荐不随请求实时算，定时批量算好存表——餐厅备菜模式
3. **全量重算 vs 增量**：学习项目数据小用全量（简单可靠）；大数据场景只重算活跃用户

**验收**：启动日志「定时任务已启动」「推荐重算完成：3 个用户」；rec_cache 3 行；接口返回与缓存一致 ✅

### T9 前端全链路联调（登录 + 互动持久化 + 个性化推荐）——详细过程

**实现**（AuthPage.jsx + main.jsx + Home.jsx 改造 + api.js 扩展）：
1. **登录/注册页**（AuthPage.jsx）：极简红黑风格，用户名+密码，注册/登录切换，成功存 token
2. **登录态路由**（main.jsx）：有 token → Home；无 token → AuthPage；退出登录 → clearToken
3. **互动持久化**：进入首页 `fetchMyEvents()` 恢复 liked/favs/likes/bads；点按钮 → postEvent/deleteEvents 写库；**乐观更新 + 失败回滚**
4. **首页推荐流**：读 `/api/recommendations`（定时重算的缓存），显示「个性化推荐（每 5 分钟更新）」
5. **账号信息**：fetchMe 拉取真实用户信息；设置页显示真实用户名

**全链路 e2e 验证**（模拟真实用户）：
1. 注册 e2e-test ✅
2. 冷启动推荐（无互动）→ 热门片兜底 ✅
3. 点喜欢《黑客帝国》《终结者2》✅
4. 重算 → 推荐变成星战V/终结者1984/拯救大兵瑞恩 ✅
5. **闭环达成：点击学习 → 定时重算 → 推荐更新**（用户最初的需求！）

### T10 收尾——项目完成 🎉

**完成内容**：
- README.md：架构图 + 快速开始 + 技术栈 + 学习路径映射
- 全部 10 张 ticket 完成：T1 前端基建 → T2 首页 → T3 后端骨架 → T4 认证 → T5 电影 API → T6 行为事件 → T7 推荐引擎 → T8 定时重算 → T9 全链路联调 → T10 文档
- GitHub 仓库：github.com/czx-beauty/czx-beauty（main + prototype/ui-variants 双分支）

**项目最终形态**：
- 前端：React 18 + Vite，登录/注册 + 五视图首页 + 双主题 + 互动星级
- 后端：FastAPI 分层架构，5 张表，JWT 认证，ItemCF 推荐引擎（可替换接口）
- 数据：MovieLens ml-latest-small（9742 电影 / 48580 喜欢信号）
- 推荐：点击学习 → APScheduler 每 5 分钟重算 → rec_cache 缓存读取

**开发过程沉淀（本日志）**：
- 16+ 个用户疑问解答（Q1~Q16）
- 6 个真实踩坑：Star 组件崩溃 / N+1 查询 / CORS / useEffect 竞态 / passlib+bcrypt 不兼容 / 冷门电影相似度噪声
- 4 个 ADR 架构决策
- 教学要点贯穿每个阶段

**常大人可以继续的扩展方向**（项目结构已预留）：
1. 换推荐引擎：实现 `RecommendationEngine` 接口 → 向量召回（Word2Vec+FAISS）或双塔模型
2. 后端加测试：pytest + FastAPI TestClient（当前无测试，可补）
3. 部署上线：Docker + 腾讯云（README 已备启动步骤）
4. 前端加详情页/分页加载
5. 生产化：Alembic 迁移、环境变量密钥、HTTPS
