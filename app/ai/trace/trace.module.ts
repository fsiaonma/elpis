import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { TraceService } from './trace.service';

@Module({
  imports: [StoreModule],
  providers: [TraceService],
  exports: [TraceService],
})
export class TraceModule {}
