import { Module } from '@nestjs/common';
import { ExtendModule } from '../../extend/extend.module';
import { ViewController } from './view.controller';

@Module({
  imports: [ExtendModule],
  controllers: [ViewController],
})
export class ViewModule {}
