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
