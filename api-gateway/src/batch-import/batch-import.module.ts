import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BatchImportController } from './batch-import.controller';
import { BatchImportService } from './batch-import.service';

@Module({
  imports: [AuditModule],
  controllers: [BatchImportController],
  providers: [BatchImportService],
})
export class BatchImportModule {}
