import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { BatchImportModule } from './batch-import/batch-import.module';
import { HealthController } from './health/health.controller';
import { MoleculesModule } from './molecules/molecules.module';
import { PredictModule } from './predict/predict.module';
import { RenderModule } from './render/render.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [MoleculesModule, SearchModule, PredictModule, RenderModule, BatchImportModule, AuditModule],
  controllers: [HealthController],
})
export class AppModule {}
