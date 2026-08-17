import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health/health.controller';
import { MoleculesModule } from './molecules/molecules.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/molecules*', '/search*', '/health*', '/docs*'],
    }),
    MoleculesModule,
    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
