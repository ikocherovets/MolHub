import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MoleculesModule } from './molecules/molecules.module';

@Module({
  imports: [MoleculesModule],
  controllers: [HealthController],
})
export class AppModule {}
