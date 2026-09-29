import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { LlmMessage } from '../contracts';
import { MemoryEntry, ThreadCheckpoint } from '../store/store.interface';
import { resolveMemoryMaxTurns } from './internal/load-memory-config';
import { runInThisContext } from 'vm';

@Injectable()
export class ThreadService {
  constructor(private readonly configService: ConfigService) {}

  createThread(): string {
    return crypto.randomUUID();
  }

  ensureThread(threadId?: string): string {
    if (typeof threadId === 'string' && threadId.trim() !== '') {
      return threadId;
    }

    return this.createThread();
  }

  buildContextMessages(checkpoint: ThreadCheckpoint | null): LlmMessage[] {
    if (!checkpoint) {
      return [];
    }

    return checkpoint.messages.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
  }

  truncate(messages: MemoryEntry[], maxTurns?: number): MemoryEntry[] {
    const limit = maxTurns ?? resolveMemoryMaxTurns(this.configService);
    if (messages.length <= limit) {
      return messages;
    }

    return messages.slice(-limit);
  }

  appendTurn(
    checkpoint: ThreadCheckpoint,
    user: string,
    assistant: string,
  ): ThreadCheckpoint {
    return {
      threadId: checkpoint.threadId,
      messages: [
        ...checkpoint.messages,
        { role: 'user', content: user },
        { role: 'assistant', content: assistant },
      ],
      updatedAt: Date.now(),
    };
  }
}
