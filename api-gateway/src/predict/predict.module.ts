import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PredictController } from './predict.controller';
import { PredictService } from './predict.service';

@Module({
  imports: [HttpModule, AuditModule],
  controllers: [PredictController],
  providers: [PredictService],
})
export class PredictModule {}
