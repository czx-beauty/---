# AGENTS.md

项目约定文件：任何 AI agent（Hermes、Claude Code、Codex 等）在本仓库工作时都应遵守。

## Agent skills

### Issue tracker

Issues live in GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project conventions

- 学习项目：企业级分层架构（FastAPI + React + PostgreSQL），以理解流程为主要目标
- 领域术语以 `CONTEXT.md` 为准，避免使用 `_Avoid_` 中的同义词
- 架构决策见 `docs/adr/`，修改前先检查是否有冲突
