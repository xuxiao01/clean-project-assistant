# 数据库与向量检索说明

本文描述本 Demo 中 **PostgreSQL + pgvector** 的用法：环境变量、库表结构、建表脚本、代码分层、灌库与检索流程，以及本地验证方式。

---

## 1. 是否需要单独的 `docs/database/` 子目录

**当前阶段建议不要建子目录**，与本仓库其他说明文档（如 `technical-design.md`）一样放在 `docs/` 根目录即可，便于一眼找到。

若后续出现多份材料（例如按版本拆分的迁移 SQL、独立运维手册、ER 图），再新建 `docs/database/` 并在其中拆分多文件会更合适。

---

## 2. 环境与依赖

### 2.1 必填环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串，例如 `postgresql://用户名@localhost:5432/数据库名`。在 `src/config/env.ts` 中为**必填**，应用启动前即会校验。 |

`.env.example` 中有占位说明；本地复制为 `.env` 后填写真实连接串。

### 2.2 数据库侧前置条件

- 已安装 **PostgreSQL**，并具备 **pgvector** 扩展（与建表脚本中的 `CREATE EXTENSION vector` 一致）。
- 已执行 **`docs/schema.sql`** 创建 `documents`、`knowledge_chunks` 表（或表结构与该脚本等价）。若你本地库是早期手工建的，请对照下文「库表结构」与脚本核对列名、类型与约束。

---

## 3. 库表结构（与代码约定一致）

以下与 `src/repositories/*.ts`、`src/types/db.ts` 中的读写字段一致。

### 3.1 `documents`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键；默认 `gen_random_uuid()`（依赖 `pgcrypto` 扩展）。 |
| `source_path` | `text` | 知识来源唯一标识，如 `docs/project-knowledge.md`。**唯一约束**。 |
| `content_hash` | `text` | 整篇文档内容 SHA-256（十六进制），用于变更检测。`NOT NULL`。 |
| `title` | `text` | 从 Markdown 解析的标题，可为空。 |
| `created_at` | `timestamptz` | 创建时间。 |
| `updated_at` | `timestamptz` | 更新时间；`UPDATE` 时由触发器自动刷新。 |

应用层通过 `ON CONFLICT (source_path) DO UPDATE` 更新 `content_hash`、`title`（见 `upsertDocument`）。

### 3.2 `knowledge_chunks`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | `bigserial` | 主键；检索结果中的 `id` 为 bigint，前端以字符串传递。 |
| `document_id` | `uuid` | 外键 → `documents(id)`，**级联删除**。 |
| `chunk_index` | `integer` | 片段序号，同一文档内从 0 递增。**与 `document_id` 组成唯一约束**。 |
| `content` | `text` | 片段正文。 |
| `chunk_content_hash` | `text` | 片段内容哈希。`NOT NULL`。 |
| `embedding` | `vector(1024)` | 向量；维度与当前嵌入模型一致（默认智谱 `embedding-2` 为 1024）。 |
| `embedding_model` | `text` | 与 `getEmbeddingModelId()` 一致，检索时按该字段过滤。 |
| `metadata` | `jsonb` | 扩展信息（如 `source_path`、`title` 等）。 |
| `created_at` | `timestamptz` | 插入时间；应用插入语句未显式写列时使用默认值。 |

**注意**：chunk 的更新策略为「删旧插新」，不设 `updated_at`。

### 3.3 TypeScript 类型（代码）

`src/types/db.ts`：`DocumentRow`、`KnowledgeChunkInsertRow` 与上表对应。

---

## 4. 建表 SQL

完整、可执行的脚本位于：

**`docs/schema.sql`**

内容包括：

- `CREATE EXTENSION IF NOT EXISTS pgcrypto`（`gen_random_uuid()`）
- `CREATE EXTENSION IF NOT EXISTS vector`
- `documents` 表 + `updated_at` 触发器
- `knowledge_chunks` 表、外键、`UNIQUE(document_id, chunk_index)`、常用 B-tree 索引
- 可选的 **IVFFLAT** 向量索引（脚本内注释掉；数据量增大后再按需启用并调 `lists`）

### 4.1 如何执行

```bash
# 示例：用连接串执行（按你本机修改）
psql "postgresql://用户名@localhost:5432/数据库名" -f docs/schema.sql
```

若库中**已有同名表但结构不同**，请勿直接覆盖；需自行编写 `ALTER` 迁移或备份后重建。

---

## 5. 代码分层与入口文件

| 职责 | 路径 |
|------|------|
| 连接池（`pg`） | `src/lib/db.ts`（`getPool()`、`testDbConnection()`） |
| 向量字面量（写入/查询 SQL） | `src/lib/pgVector.ts`（`formatVectorLiteral`） |
| 文档表读写 | `src/repositories/documentsRepository.ts` |
| Chunk 批量写入与向量检索 | `src/repositories/knowledgeChunksRepository.ts` |
| 事务内：文档 upsert + 删旧 chunk + 插新 chunk | `src/services/knowledgeDocumentDbService.ts`（如 `replaceKnowledgeForDocument`） |
| 启动灌库 | `src/services/knowledgeInit.ts` |
| 问答前检索 | `src/services/retrievalService.ts` |

路由层（`src/routes/chat.ts`）只编排服务，不直接写 SQL。

---

## 6. 向量检索约定

- **度量**：与 pgvector 的 **余弦距离** 一致，查询中使用运算符 **`<=>`**（cosine distance）。
- **分数**：应用层将距离转为「相似度」时使用 **`1 - distance`**，便于与「越大越相关」的展示一致（具体见 `searchChunksByEmbedding`）。
- **模型一致**：检索 SQL 会按 **`embedding_model`** 过滤，保证查询向量与库内向量来自同一嵌入模型（见 `getEmbeddingModelId()`）。

向量加速索引见 `docs/schema.sql` 内注释；初版数据量小时全表扫描也可接受。

---

## 7. 启动时的灌库流程（简述）

1. 读取 Markdown → 计算文档级 `content_hash`、解析标题等。
2. 切分为 chunk。
3. 对每个 chunk 调用智谱嵌入 API 生成向量。
4. 在事务中：**upsert `documents`** → **删除该文档旧 `knowledge_chunks`** → **批量插入新 chunk**。

无 chunk 时仍会同步文档行并清空该文档下的 chunk（见 `knowledgeInit` 中空列表分支）。

---

## 8. 本地验证

### 8.1 仅测数据库连通

```bash
npm run test-db
```

脚本：`src/scripts/test-db.ts`，会输出当前库名、用户与时间；失败时进程非 0 退出。

### 8.2 端到端

1. 配置 `.env`（含 `DATABASE_URL`、`ZHIPU_API_KEY` 等）。
2. `npm run dev`：观察控制台灌库日志。
3. 打开前端页面或通过 `POST /api/chat` 提问，确认回答与 `references` 正常。

---

## 9. 运维与扩展时注意点

- **更换嵌入模型**：需统一更新嵌入调用与库中 `embedding_model`，旧向量与查询向量模型不一致会导致检索质量下降或需全量重嵌。
- **向量维度**：`vector(1024)` 需与模型输出一致；变更模型时通常涉及 `ALTER TABLE` 改维度与全量重算 embedding。
- **连接池**：生产环境可再调 `pg` Pool 参数（最大连接数、空闲超时等），当前 Demo 使用默认池配置。

---

## 10. 相关文件

| 文件 | 说明 |
|------|------|
| `docs/schema.sql` | 建表与扩展、索引（权威 DDL，可与本文第 3、4 节对照） |
| `.env.example` | 环境变量模板 |
| `src/config/env.ts` | 含 `databaseUrl` 等必填项 |
| `src/scripts/test-db.ts` | 连通性测试脚本 |
