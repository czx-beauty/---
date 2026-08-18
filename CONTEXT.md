# Movie Recommender — Context（领域词汇表）

电影推荐学习项目：用户通过点击电影表达兴趣，系统据此学习喜好并给出个性化推荐。技术栈 FastAPI + React + PostgreSQL。企业级分层架构，学习为主。

## Language

**用户 (User)**:
注册登录的网站使用者，拥有唯一的 userId，系统为其维护行为历史与个性化推荐。
_Avoid_: 会员, 账号, customer

**电影 (Movie)**:
推荐系统的基本内容单元，来自 ml-latest-small 数据集，含标题与类型（genres）。
_Avoid_: 影片, item, 内容

**点击 (Click)**:
用户对电影卡片的最主要交互，被视为「感兴趣」的隐式反馈信号（正样本）。
_Avoid_: 浏览, 查看

**评分 (Rating)**:
用户对电影的显式评价（1-5 星）。历史数据来自 MovieLens，用于冷启动初始化与算法验证。
_Avoid_: 打分, score

**喜好 (Preference)**:
系统对用户兴趣的模型化表达，由点击与评分推导，随时间与行为演化。
_Avoid_: 画像, profile, 口味

**推荐 (Recommendation)**:
系统为用户生成的电影列表，分为冷启动推荐（基于热门/高分）与个性化推荐（基于用户行为）。
_Avoid_: 猜你喜欢, 推送

**推荐引擎 (Recommendation Engine)**:
负责生成推荐的算法模块。当前实现为协同过滤（ItemCF/UserCF），设计上允许替换（预留向量召回/双塔）。
_Avoid_: 算法模块, recommender

**行为事件 (Event)**:
用户行为的记录单元（点击、评分），写入数据库，作为定时重算推荐的数据来源。
_Avoid_: 日志, log, 轨迹

**推荐缓存 (Recommendation Cache)**:
定时重算后存放「用户 → 推荐列表」的存储（数据库表），接口读取缓存返回，避免每次请求全量重算。
_Avoid_: 预热, 快照
