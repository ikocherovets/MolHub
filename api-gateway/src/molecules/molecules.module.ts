import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MoleculesController } from './molecules.controller';
import { MoleculesService } from './molecules.service';

@Module({
  imports: [HttpModule, AuditModule],
  controllers: [MoleculesController],
  providers: [MoleculesService],
})
export class MoleculesModule {}
