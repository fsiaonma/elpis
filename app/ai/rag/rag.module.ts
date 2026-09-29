import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { RetrieverService } from './retriever.service';

@Module({
  imports: [StoreModule],
  providers: [RetrieverService],
  exports: [RetrieverService],
})
export class RagModule {}
