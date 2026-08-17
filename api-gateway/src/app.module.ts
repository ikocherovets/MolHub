import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { HealthController } from './health/health.controller';
import { MoleculesModule } from './molecules/molecules.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [MoleculesModule, SearchModule, AuditModule],
  controllers: [HealthController],
})
export class AppModule {}
