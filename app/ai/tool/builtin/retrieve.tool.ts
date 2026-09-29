import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '../../../config/config.service';
import { resolveRagOptions } from '../../rag/internal/load-rag-config';
import { RetrieverService } from '../../rag/retriever.service';
import { BuiltinToolFactory } from '../tool.interface';

interface RetrieveInput {
  query?: string;
}

const retrieveTool: BuiltinToolFactory = ({ moduleRef }) => {
  const configService = moduleRef.get(ConfigService, { strict: false });
  const options = resolveRagOptions(configService);

  return {
    name: options.tool?.name ?? 'retrieve',
    description:
      options.tool?.description ??
      '从私有知识库检索相关片段；回答必须引用返回的 docId/text',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for the private knowledge base',
        },
      },
      required: ['query'],
    },
    execute: async (input: unknown) => {
      const { query } = input as RetrieveInput;
      if (typeof query !== 'string' || query.trim() === '') {
        throw new Error('query is required');
      }

      const retriever = moduleRef.get(RetrieverService, { strict: false });
      const hits = await retriever.retrieve(query.trim());
      return { hits };
    },
  };
};

export default retrieveTool;
