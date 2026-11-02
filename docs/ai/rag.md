# RAG 知识库

Elpis 提供「切分 → 向量化 → 存储 → 检索」的完整链路，检索能力以内置工具 `retrieve` 暴露给 Agent。

```text
文档(.md/.txt) ─▶ Chunker ─▶ Embedding ─▶ VectorStore(file / qdrant)
                                                   │
                     Agent ── retrieve(query) ─────┘ ─▶ topK 片段 { docId, text, score }
```

## 1. 配置 Embedding

```js
ai: {
  embedding: {
    default: 'qwen',
    models: {
      qwen: {
        provider: 'openai-compatible',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'text-embedding-v3',
        apiKey: process.env.QWEN_API_KEY,
      },
    },
  },
}
```

自定义向量模型：

```ts
import type { EmbeddingProvider } from '@fsiaonma/elpis';

export class LocalEmbedding implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => myModel.encode(t)));
  }
}
```

```js
embedding: { default: 'local', models: { local: { use: LocalEmbedding } } }
```

## 2. 配置向量库

```js
ai: {
  store: {
    // 本地文件（默认，路径默认 .elpis/vector）
    vector: { driver: 'file', path: './data/vector' },
    // 或简写为路径字符串
    // vector: './data/vector',
  },
}
```

使用 [Qdrant](https://qdrant.tech/)：

```bash
docker run -p 6333:6333 qdrant/qdrant
```

```js
store: {
  vector: {
    driver: 'qdrant',
    url: 'http://127.0.0.1:6333',   // 默认值
    collection: 'knowledge',        // 默认 rubric
  },
}
```

## 3. 切分与检索参数

```js
ai: {
  rag: {
    chunk: { size: 800, overlap: 100 },   // 默认 800 / 100
    topK: 5,                              // 最小为 5
    tool: {
      name: 'retrieve',
      description: '查询内部产品文档；回答必须引用返回的 docId 与原文片段',
    },
  },
}
```

`tool.description` 会直接给模型看，写清楚知识库里有什么、回答要求是什么。

### 自定义 Chunker

默认按长度滑窗切分。文档有明确结构时（例如按章节、按评分等级），自定义 Chunker 效果更好：

```ts
// app/rag/heading.chunker.ts
export interface Chunk {
  id: string;
  docId: string;
  text: string;
  meta?: Record<string, unknown>;
}

export class HeadingChunker {
  chunk(text: string, meta?: Record<string, unknown>): Chunk[] {
    const docId = String(meta?.docId ?? 'doc.md');
    return text
      .split(/^## /m)
      .filter((part) => part.trim())
      .map((part, i) => {
        const title = part.split('\n')[0].trim();
        return {
          id: `${docId}#${i}`,
          docId: `${docId}#${title}`,
          text: `## ${part.trim()}`,
          meta: { title },
        };
      });
  }
}
```

```js
const { HeadingChunker } = require('../dist/rag/heading.chunker');

module.exports = {
  ai: { rag: { chunker: { use: HeadingChunker } } },
};
```

`meta` 中会传入 `docId`（相对目录的文件路径）与 `sourcePath`。

## 4. 导入文档

在业务模块中引入 `RagModule`，用 `RetrieverService` 导入：

```ts
import { Module, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RagModule, RetrieverService } from '@fsiaonma/elpis/nest';

@Injectable()
export class KnowledgeService implements OnApplicationBootstrap {
  constructor(private readonly retriever: RetrieverService) {}

  async onApplicationBootstrap() {
    // 递归读取目录下所有 .md / .txt
    const { ingested, chunks } = await this.retriever.ingestFromDirectory('./data/knowledge');
    console.log(`[Knowledge] ingested ${ingested} files, ${chunks} chunks`);
  }

  search(query: string) {
    return this.retriever.retrieve(query, 5);   // [{ id, docId, text, score, meta }]
  }
}

@Module({
  imports: [RagModule],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
```

> 知识库较大时，建议写一个独立脚本或管理接口触发导入，而不是每次启动都导入。

## 5. 在 Agent 中使用

```ts
const agent: AgentDefinition = {
  name: 'doc-assistant',
  skills: [],
  tools: ['retrieve'],
  prompt: `回答产品问题前先调用 retrieve 检索。
回答必须引用检索结果中的 docId 或原文；检索不到时明确说未找到，不要编造。`,
};
```

模型拿到的结果形如：

```json
[
  { "docId": "guide/config.md#homePage", "text": "homePage 相对于 /view/dashboard ...", "score": 0.83 }
]
```
