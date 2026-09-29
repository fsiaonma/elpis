import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { CheckpointService } from './checkpoint.service';
import { ThreadService } from './thread.service';

@Module({
  imports: [StoreModule],
  providers: [ThreadService, CheckpointService],
  exports: [ThreadService, CheckpointService],
})
export class MemoryModule {}
