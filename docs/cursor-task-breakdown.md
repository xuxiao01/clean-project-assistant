# 清洁项目助手 Demo - Cursor 任务拆分文档

## 1. 文档说明

本文档用于将“清洁项目助手 Demo”按照最小可实现单元进行拆分，方便逐轮与 Cursor 沟通开发。

拆分原则如下：

- 每次只完成一个最小模块
- 每次改动尽量少量文件
- 每个模块都应具备明确目标
- 每个模块都应具备可验证结果
- 优先跑通主链路，避免过度工程化
- 所有实现均基于既定技术方案：
  - Node.js
  - TypeScript
  - Express
  - 简单 HTML 页面
  - Markdown 文档
  - 本地内存向量检索
  - Gemini API

---

## 2. 与 Cursor 沟通的统一规则

建议每次给 Cursor 提需求时，都附带以下统一要求：

```text
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

## 3. 推荐开发顺序

建议按以下顺序推进：

### 第一轮：先跑服务
1. 模块 1：初始化 Node + TS + Express 项目骨架
2. 模块 2：增加基础配置管理
3. 模块 3：做一个假的 chat 接口
4. 模块 4：做最小前端页面

### 第二轮：接入知识文档
5. 模块 5：实现 Markdown 文档读取
6. 模块 6：实现最小文本切分器
7. 模块 10：实现文档预处理流程

### 第三轮：先通模型
8. 模块 8：接入 Gemini 聊天调用
9. 模块 9：让 chat 接口调用真实模型

### 第四轮：完成 RAG 核心
10. 模块 7：先做“假向量库”
11. 模块 11：接入 embedding 生成
12. 模块 12：把 chunks 存入内存向量库
13. 模块 13：实现真正的相似度检索
14. 模块 14：实现 prompt 构建服务
15. 模块 15：串起完整 RAG 问答链路

### 第五轮：补展示与收尾
16. 模块 16：前端展示引用片段
17. 模块 17：补充错误处理和空结果处理
18. 模块 18：补充 README 留痕

---

## 4. 模块拆分详情

---

# 模块 1：初始化 Node + TS + Express 项目骨架

## 模块目标
先把后端项目跑起来，避免一开始就接 AI 和文档处理。

## 要做什么
- 初始化 Node.js + TypeScript 项目
- 安装 Express
- 配置基础目录结构
- 创建 `src/app.ts` 和 `src/server.ts`
- 提供健康检查接口

## 涉及文件
- `package.json`
- `tsconfig.json`
- `src/app.ts`
- `src/server.ts`

## 完成标志
启动后访问：

`GET /health`

返回：

```json
{ "success": true }
```

## 给 Cursor 的提示词
```text
请帮我初始化一个 Node.js + TypeScript + Express 的最小后端项目。

要求：
1. 使用 ESM 风格
2. 创建 src/app.ts 和 src/server.ts
3. 提供 GET /health 接口，返回 { success: true }
4. 保持结构简单，不要引入 NestJS、Fastify、数据库、鉴权
5. 如果需要，补充 package.json 和 tsconfig.json 的最小配置
6. 输出你新增或修改了哪些文件，并告诉我如何启动

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 2：增加基础配置管理

## 模块目标
把端口、API Key 等配置统一管理，避免后面写死。

## 要做什么
- 新建环境变量配置模块
- 读取 `PORT`、`GEMINI_API_KEY`
- 启动时校验必要配置

## 涉及文件
- `.env.example`
- `src/config/env.ts`
- `src/server.ts`

## 完成标志
- 未配置必要变量时有明确报错
- 已配置时可正常启动

## 给 Cursor 的提示词
```text
请为当前项目补一个最小的环境变量配置模块。

要求：
1. 新建 src/config/env.ts
2. 统一读取 PORT 和 GEMINI_API_KEY
3. 对 GEMINI_API_KEY 做必要校验
4. 增加 .env.example
5. 不要引入复杂配置库，保持最小实现
6. 告诉我修改了哪些文件，以及本地如何配置

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 3：做一个假的 chat 接口

## 模块目标
先不接模型，先把接口链路打通。

## 要做什么
- 新建 `/api/chat`
- 接收 `question`
- 返回一个固定测试结果

## 涉及文件
- `src/routes/chat.ts`
- `src/app.ts`

## 完成标志
请求：

```json
{ "question": "你好" }
```

返回：

```json
{
  "success": true,
  "data": {
    "answer": "这是一个测试回复"
  }
}
```

## 给 Cursor 的提示词
```text
请在当前 Express 项目中新增一个最小聊天接口。

要求：
1. 新建 POST /api/chat
2. 接收 body 中的 question 字段
3. 暂时不要接大模型，直接返回固定测试数据
4. 路由层只做参数接收和响应返回，不要写复杂业务逻辑
5. 如果 question 为空，返回合理的 400 错误
6. 告诉我修改了哪些文件，并给我一个 curl 测试示例

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 4：做最小前端页面

## 模块目标
把“输入问题 → 调接口 → 展示结果”打通。

## 要做什么
- 一个简单 HTML 页面
- 输入框、按钮、结果展示区
- 调用 `/api/chat`

## 涉及文件
- `public/index.html`
- `src/app.ts`

## 完成标志
在浏览器中输入内容，点击按钮后能看到接口返回内容。

## 给 Cursor 的提示词
```text
请帮我新增一个最小 HTML 演示页面，用于调用 POST /api/chat。

要求：
1. 页面只需要输入框、发送按钮、结果展示区
2. 使用原生 HTML + JS 即可
3. 将 public/index.html 作为静态页面提供
4. 点击发送后调用 /api/chat 并展示返回的 answer
5. 不要引入前端框架，不要写复杂样式
6. 告诉我修改了哪些文件以及访问路径

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 5：实现 Markdown 文档读取

## 模块目标
开始接知识库，但先只做“读取文档”。

## 要做什么
- 从 `docs/project-knowledge.md` 读取文本
- 输出原始字符串

## 涉及文件
- `docs/project-knowledge.md`
- `src/loaders/documentLoader.ts`

## 完成标志
调用函数后能正确读到 Markdown 内容。

## 给 Cursor 的提示词
```text
请帮我实现一个最小的 Markdown 文档读取模块。

要求：
1. 新建 src/loaders/documentLoader.ts
2. 读取 docs/project-knowledge.md 文件内容
3. 返回完整字符串
4. 暂时只支持单个 Markdown 文件，不要做多格式兼容
5. 使用 TypeScript，避免 any
6. 给我一个简单的调用示例

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 6：实现最小文本切分器

## 模块目标
把长文本拆成 chunk。

## 要做什么
- 输入一段长文本
- 输出 chunk 数组
- 支持简单 `chunkSize` 和 `overlap`

## 涉及文件
- `src/splitters/textSplitter.ts`
- `src/types/index.ts`

## 完成标志
给一段文本能返回多个 chunk，每个 chunk 带 `id`、`content`、`chunkIndex`。

## 给 Cursor 的提示词
```text
请帮我实现一个最小文本切分模块。

要求：
1. 新建 src/splitters/textSplitter.ts
2. 输入为长文本字符串
3. 输出为 chunk 数组
4. 每个 chunk 至少包含 id、content、chunkIndex
5. 支持 chunkSize 和 overlap 参数
6. 当前优先简单可靠实现，不要做复杂语义切分
7. 补充需要的 TypeScript 类型定义
8. 给我一个简单示例输出

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 7：先做“假向量库”

## 模块目标
先把检索结构搭起来，即使暂时不用真 embedding。

## 要做什么
- 定义 `VectorRecord`
- 提供存储 chunk 的结构
- 提供一个最小 `search` 方法接口
- 暂时允许占位实现

## 涉及文件
- `src/stores/vectorStore.ts`
- `src/types/index.ts`

## 完成标志
已有最小接口：
- `addDocuments`
- `search`

## 给 Cursor 的提示词
```text
请帮我实现一个最小的内存向量存储模块骨架。

要求：
1. 新建 src/stores/vectorStore.ts
2. 定义 VectorRecord 结构，至少包含 id、content、embedding、metadata
3. 提供 addDocuments 和 search 两个方法
4. 当前 search 可以先写成占位实现，但接口结构要清晰
5. 不要接数据库，不要引入 Qdrant
6. 补充所需类型定义

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 8：接入 Gemini 聊天调用

## 模块目标
先让模型真的能返回答案，但先不接检索。

## 要做什么
- 封装 Gemini 调用服务
- 输入一个 prompt
- 返回模型文本结果

## 涉及文件
- `src/services/chatService.ts`
- `src/config/env.ts`

## 完成标志
传入固定 prompt 时，接口能返回真实模型回复。

## 给 Cursor 的提示词
```text
请帮我在当前 Node.js + TypeScript 项目中封装一个最小的 Gemini 文本调用服务。

要求：
1. 新建 src/services/chatService.ts
2. 从环境变量读取 GEMINI_API_KEY
3. 提供一个函数，输入 prompt，输出模型返回的文本
4. 当前只做最小文本调用，不要加多轮对话、函数调用、复杂封装
5. 如果调用失败，要抛出清晰错误
6. 给我一个如何在路由里临时调用的示例

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 9：让 chat 接口调用真实模型

## 模块目标
把假的 `/api/chat` 换成真的模型调用。

## 要做什么
- 路由接收问题
- 调用 `chatService`
- 返回真实模型回答

## 涉及文件
- `src/routes/chat.ts`
- `src/services/chatService.ts`

## 完成标志
输入任意问题，接口都能拿到真实模型返回。

## 给 Cursor 的提示词
```text
请把当前 POST /api/chat 从固定返回改成真实调用 chatService。

要求：
1. 保留当前接口结构
2. question 作为 prompt 输入 chatService
3. 返回 { success: true, data: { answer } }
4. 错误时返回合理的错误响应
5. 只改与此需求相关的文件，不做无关重构

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 10：实现文档预处理流程

## 模块目标
服务启动时自动加载文档并切分。

## 要做什么
- 启动时读取 Markdown
- 调用 splitter
- 产出 chunks

## 涉及文件
- `src/loaders/documentLoader.ts`
- `src/splitters/textSplitter.ts`
- `src/app.ts` 或单独初始化模块

## 完成标志
服务启动日志里能看到：
- 文档读取成功
- chunk 数量

## 给 Cursor 的提示词
```text
请帮我增加一个最小的知识库初始化流程。

要求：
1. 服务启动时读取 docs/project-knowledge.md
2. 使用 textSplitter 切分为 chunks
3. 暂时只需要打印 chunk 数量和部分示例日志
4. 不要接入 embedding 和检索
5. 尽量保持初始化逻辑独立清晰

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 11：接入 embedding 生成

## 模块目标
真正开始做 RAG 的向量化部分。

## 要做什么
- 给 chunk 生成 embedding
- 给 query 生成 embedding

## 涉及文件
- `src/embeddings/embedder.ts`

## 完成标志
输入文本后能得到数值向量数组。

## 给 Cursor 的提示词
```text
请帮我新增一个最小 embedding 模块。

要求：
1. 新建 src/embeddings/embedder.ts
2. 提供对单条文本生成 embedding 的函数
3. 后续需要同时支持 chunk 和用户 query
4. 不要在别的文件里直接写 embedding 调用，统一收口到该模块
5. 如果失败，抛出清晰错误
6. 给我一个简单调用示例

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 12：把 chunks 存入内存向量库

## 模块目标
让预处理流程从“只切分”升级到“切分 + 向量化 + 存储”。

## 要做什么
- chunks 批量 embedding
- 生成 `VectorRecord`
- 存入内存 store

## 涉及文件
- `src/embeddings/embedder.ts`
- `src/stores/vectorStore.ts`
- 初始化模块

## 完成标志
启动后知识库已完成向量化并缓存到内存。

## 给 Cursor 的提示词
```text
请帮我把知识库初始化流程补全为：读取文档 -> 切分 chunks -> 生成 embeddings -> 存入内存向量库。

要求：
1. 复用已有的 documentLoader、textSplitter、embedder、vectorStore
2. 启动时一次性完成初始化
3. 打印初始化完成日志，包括 chunk 数量
4. 代码保持最小清晰，不做复杂抽象

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 13：实现真正的相似度检索

## 模块目标
输入问题后能拿到最相关的 Top-K chunks。

## 要做什么
- query embedding
- cosine similarity
- 排序取 Top-K

## 涉及文件
- `src/stores/vectorStore.ts`
- `src/services/retrievalService.ts`

## 完成标志
给定问题时能返回最相关 chunk 列表。

## 给 Cursor 的提示词
```text
请帮我实现最小可用的相似度检索。

要求：
1. 基于已有内存向量库实现 cosine similarity
2. 新建 src/services/retrievalService.ts
3. 输入用户问题文本，返回 Top-K 相关 chunks
4. K 值先支持通过参数传入
5. 返回结果中保留 chunk 的 id、content、metadata、score
6. 给我一个简单的调试示例

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 14：实现 prompt 构建服务

## 模块目标
不要把 prompt 直接写死在路由里。

## 要做什么
- 输入：问题 + 检索结果
- 输出：最终 prompt
- 要求模型只基于文档回答

## 涉及文件
- `src/services/promptService.ts`

## 完成标志
能够看到结构清晰的 prompt 文本。

## 给 Cursor 的提示词
```text
请帮我新增一个 prompt 构建模块。

要求：
1. 新建 src/services/promptService.ts
2. 输入用户问题和检索到的 chunks
3. 输出最终发给模型的 prompt 字符串
4. prompt 中要明确要求模型仅基于提供文档回答
5. 如果文档中没有答案，要明确说未提及
6. 保持实现简单清晰

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 15：串起完整 RAG 问答链路

## 模块目标
完成核心闭环。

## 要做什么
- `/api/chat`
- 调用 `retrievalService`
- 调用 `promptService`
- 调用 `chatService`
- 返回 `answer + references`

## 涉及文件
- `src/routes/chat.ts`
- `src/services/retrievalService.ts`
- `src/services/promptService.ts`
- `src/services/chatService.ts`

## 完成标志
输入“如何查看任务进度”等问题时，能返回：
- `answer`
- 命中的 `references`

## 给 Cursor 的提示词
```text
请帮我把当前系统串成完整的最小 RAG 问答链路。

要求：
1. POST /api/chat 接收 question
2. 先通过 retrievalService 检索相关 chunks
3. 再通过 promptService 构建 prompt
4. 再调用 chatService 获取模型回答
5. 返回结构包含 answer 和 references
6. references 中至少包含 chunk id 和 content
7. 只做最小闭环，不加对话历史、不加多轮状态

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 16：前端展示引用片段

## 模块目标
让 demo 更像完整产品，也方便排查检索命中情况。

## 要做什么
- 页面展示 AI 回答
- 页面展示命中的 references

## 涉及文件
- `public/index.html`

## 完成标志
页面上除了 answer，还能看到参考片段。

## 给 Cursor 的提示词
```text
请帮我更新当前 HTML 页面。

要求：
1. 在展示 answer 的同时，展示接口返回的 references
2. 每个 reference 至少展示 chunk id 和内容摘要
3. 页面保持简洁，不引入前端框架
4. 不要做复杂样式

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 17：补充错误处理和空结果处理

## 模块目标
让 demo 更稳，避免异常时体验过差。

## 要做什么
- 处理 `question` 为空
- 处理知识库未初始化
- 处理检索结果为空
- 处理模型调用失败

## 涉及文件
- `src/routes/chat.ts`
- `src/services/*`

## 完成标志
常见异常都有合理提示。

## 给 Cursor 的提示词
```text
请帮我补充当前系统的最小错误处理。

要求：
1. 处理 question 为空
2. 处理知识库未初始化
3. 处理检索结果为空
4. 处理模型调用失败
5. 给出清晰错误信息，不要吞错
6. 只做必要改动，不要无关重构

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

# 模块 18：补充 README 留痕

## 模块目标
为项目补充最基本的使用说明与留痕文档。

## 要做什么
- 项目介绍
- 启动方式
- 环境变量说明
- 文档位置说明
- 当前能力范围

## 涉及文件
- `README.md`

## 完成标志
别人拉下项目后知道怎么配置和运行。

## 给 Cursor 的提示词
```text
请根据当前项目结构，帮我生成一个简洁的 README.md。

要求：
1. 说明项目目标
2. 说明技术栈
3. 说明如何安装依赖和启动
4. 说明环境变量配置
5. 说明 docs/project-knowledge.md 的作用
6. 说明当前 demo 的能力边界

额外要求：
1. 只实现当前这个最小模块，不要提前做后续功能
2. 只修改和当前需求相关的文件
3. 保持 Node.js + TypeScript + Express 技术栈，不引入额外框架
4. 输出修改文件清单、核心实现说明、验证方式
```

---

## 5. 最小执行建议

如果你想以最快速度推进，建议优先完成以下 10 步：

1. 初始化 Express + TypeScript
2. 增加 `/health`
3. 增加 `/api/chat` 假接口
4. 增加 HTML 页面联调
5. 读取 Markdown
6. 文本切分
7. 接入 Gemini 文本调用
8. 接入 embedding
9. 实现 Top-K 检索
10. 串成完整 RAG 问答

---

## 6. 最终建议

开发过程中，不建议一次性把多个大模块同时丢给 Cursor。

更推荐的方式是：

- 一轮只做 1 个模块
- 最多一次做 2 个强相关模块
- 每完成一个模块就本地验证
- 跑通后再进入下一轮

这样可以最大程度降低 AI 改乱项目结构和引入无关复杂度的风险。

本项目的最优目标不是“一次生成完整系统”，而是：

**逐模块稳定落地，最终跑通最小可用 Demo。**
