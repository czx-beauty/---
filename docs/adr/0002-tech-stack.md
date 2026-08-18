# 0002 - 技术栈：FastAPI + React + PostgreSQL

采用企业级主流组合：后端 FastAPI（Python 现代 API 框架，自动 OpenAPI 文档）、前端 React + Vite（组件化 SPA）、数据库 PostgreSQL（工业标准）。用户只学过 MySQL，但两者 SQL 兼容度 95%，PostgreSQL 功能更强，属免费升级。

**Status**: accepted

**Considered Options**: Django 全栈（一体化但前端弱）、Flask + SQLite（轻量但非企业级）

**Consequences**: 前端引入 Node 工具链；本机用 Homebrew 安装 PostgreSQL（原生进程，比 Docker 少一层学习负担）；数据库访问使用 SQLAlchemy ORM。
