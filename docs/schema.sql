-- 清洁项目助手 Demo — PostgreSQL + pgvector 建表脚本
-- 与 src/repositories/*.ts、src/types/db.ts 中的约定一致。
-- 使用方式（示例）：psql "$DATABASE_URL" -f docs/schema.sql

-- UUID（若 PostgreSQL 版本较旧无内置 gen_random_uuid，可保留 pgcrypto）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 向量类型与运算符
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- documents：按来源路径唯一，文档级 content_hash / title
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  content_hash text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_source_path_key UNIQUE (source_path)
);

CREATE OR REPLACE FUNCTION documents_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE documents_set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_chunks：归属文档、顺序唯一、向量与模型标识
-- embedding 维度固定 1024。
-- 工程约束：Gemini 侧通过 outputDimensionality=1024 主动对齐，不在当前阶段修改库表结构。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id bigserial PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  chunk_content_hash text NOT NULL,
  embedding vector(1024) NOT NULL,
  embedding_model text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_chunks_document_id_chunk_index_key UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
  ON knowledge_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_model
  ON knowledge_chunks (embedding_model);

-- 可选：余弦检索加速（数据量较大时再启用；lists 需按数据量与版本文档调参）
-- CREATE INDEX idx_knowledge_chunks_embedding_ivfflat
--   ON knowledge_chunks
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
