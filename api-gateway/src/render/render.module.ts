import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

@Module({
  imports: [HttpModule, AuditModule],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
