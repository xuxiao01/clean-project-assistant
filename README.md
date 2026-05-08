# 清洁 AI 助手 Demo（RAG + pgvector）

一个本地可运行的“项目知识库问答”Demo：启动时读取 Markdown 知识文档，切分成 chunk，生成 embedding 写入 PostgreSQL（pgvector），请求时检索 Top-K 片段并调用大模型生成回答。

## 功能概览

- **知识库来源**：`docs/project-knowledge.md`（Markdown）
- **灌库流程**：Markdown → chunk → embedding → PostgreSQL（`documents` + `knowledge_chunks`）
- **检索方式**：pgvector 余弦距离（`<=>`）Top-K
- **大模型**：支持 **Zhipu / Gemini**（环境变量单活切换）
- **前端**：`public/index.html`（最小页面）
- **后端**：Node.js + TypeScript + Express

## 目录结构（关键）

```text
docs/                 # 设计文档与知识文档
public/               # 静态页面
src/
  config/             # 环境变量与配置校验
  embeddings/         # embedding 生成（按 provider 分发）
  repositories/       # documents/knowledge_chunks SQL
  services/           # 灌库、检索、prompt、chat
  routes/             # HTTP 路由
  lib/                # db/pgvector/hash 等工具
```

## 快速开始

### 1) 安装依赖

```bash
npm i
```

### 2) 准备数据库（PostgreSQL + pgvector）

确保你本地 PostgreSQL 可连接，例如：

```bash
psql -h localhost -p 5432 -U xuxiao -d cleaner_ai
```

执行建表脚本（新库推荐）：

```bash
psql "$DATABASE_URL" -f docs/schema.sql
```

更详细说明见 `docs/database.md`。

### 3) 配置环境变量

复制模板：

```bash
cp .env.example .env
```

至少配置：

- `DATABASE_URL`
- `LLM_PROVIDER`（`zhipu` 或 `gemini`）
- 对应 provider 的 API Key（`ZHIPU_API_KEY` 或 `GEMINI_API_KEY`）

### 4) 启动开发环境

```bash
npm run dev
```

打开 `http://localhost:3000`，输入问题即可看到回答与引用片段。

## Provider 切换（单活）

本项目采用 **环境变量单活 provider**：

- `LLM_PROVIDER=zhipu`：聊天与 embedding 都使用智谱
- `LLM_PROVIDER=gemini`：聊天与 embedding 都使用 Gemini

切换后需要 **重启服务**（环境变量在启动时加载）。

### 重要约束：Gemini embedding 固定 1024 维

为了复用数据库现有 `knowledge_chunks.embedding vector(1024)` 列，项目采用“**同维度对齐策略**”：

- Gemini embedding 请求 **必须**显式 `outputDimensionality = 1024`
- 代码会在运行时校验返回向量维度是否为 1024，避免误用默认维度写入数据库

当前阶段 **非目标**（刻意不做）：

- 不实现多 provider 同库并存
- 不新增 provider 隔离维度
- 不修改现有数据库 schema（零 DDL 变更）

## 脚本

- 启动开发：`npm run dev`
- 构建：`npm run build`
- 生产启动：`npm start`
- 测试数据库连通性：`npm run test-db`

## 常见问题（Troubleshooting）

### 1) Gemini embedding 404：模型不存在/不支持 embedContent

示例错误：

- `models/text-embedding-004 is not found ... or is not supported for embedContent`

处理：

- 用 `ListModels` 查询你账号实际可用模型：

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=你的GEMINI_API_KEY"
```

- 选择 `supportedGenerationMethods` 包含 `embedContent` 的 embedding 模型（例如 `gemini-embedding-001`），填入：
  - `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`

注意：`.env` 里的变量不会自动进入你的 shell，`curl ...?key=$GEMINI_API_KEY` 只有在你 `export GEMINI_API_KEY=...` 后才会生效。

### 2) Gemini 429：Quota exceeded（免费额度为 0）

如果报错里出现：

- `Quota exceeded for metric: ... generate_content_free_tier_requests, limit: 0`

这表示当前 key/项目对该模型的免费额度为 0（不是代码问题）。可选处理：

- 绑定 billing / 调整配额
- 或先切回 `LLM_PROVIDER=zhipu` 跑通 demo

### 3) 切换 provider 后检索不一致

本项目是“单活 provider + 重灌库”策略。切换 provider 后请重启服务并观察启动日志，确保已按当前 provider 重新生成 embedding 并写入数据库。

## 相关文档

- `docs/technical-design.md`：整体技术方案说明
- `docs/database.md`：数据库与向量检索说明（字段/脚本/流程）
- `docs/schema.sql`：建表与扩展脚本

