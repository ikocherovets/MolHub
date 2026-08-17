import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health/health.controller';
import { MoleculesModule } from './molecules/molecules.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/molecules*', '/health*', '/docs*'],
    }),
    MoleculesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
