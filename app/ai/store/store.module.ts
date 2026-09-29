import { Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { resolveMemoryPath } from '../memory/internal/load-memory-config';
import {
  resolveTraceStorePath,
  resolveVectorStorePath,
} from './internal/load-store-config';
import { FileMemoryStore } from './reference/file-memory.store';
import { FileTraceStore } from './reference/file-trace.store';
import { FileVectorStore } from './reference/file-vector.store';
import { MEMORY_STORE, TRACE_STORE, VECTOR_STORE } from './store.interface';

@Module({
  providers: [
    {
      provide: TRACE_STORE,
      useFactory: (configService: ConfigService) => {
        const tracePath = resolveTraceStorePath(configService);
        return new FileTraceStore(tracePath);
      },
      inject: [ConfigService],
    },
    {
      provide: MEMORY_STORE,
      useFactory: (configService: ConfigService) => {
        const memoryPath = resolveMemoryPath(configService);
        return new FileMemoryStore(memoryPath);
      },
      inject: [ConfigService],
    },
    {
      provide: VECTOR_STORE,
      useFactory: (configService: ConfigService) => {
        const vectorPath = resolveVectorStorePath(configService);
        return new FileVectorStore(vectorPath);
      },
      inject: [ConfigService],
    },
  ],
  exports: [TRACE_STORE, MEMORY_STORE, VECTOR_STORE],
})
export class StoreModule {}
