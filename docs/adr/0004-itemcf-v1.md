# 0004 - 推荐引擎 v1：经典协同过滤（ItemCF/UserCF）

第一期推荐引擎实现经典协同过滤：评分二值化（>=4 为喜欢）+ 物品相似度（ItemCF）为主。设计上通过统一接口（`RecommendationEngine`）封装，后续可替换为向量召回（Word2Vec/FAISS）或双塔模型而不影响上层。

**Status**: accepted

**Considered Options**: 直接上双塔深度学习模型（学习曲线陡、调参难、易烂尾）；向量召回（依赖额外依赖 FAISS）

**Consequences**: 协同过滤效果上限有限，但架构预留扩展位；训练脚本独立于 Web 服务，可单独运行验证。
