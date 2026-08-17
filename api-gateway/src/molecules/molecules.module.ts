import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MoleculesController } from './molecules.controller';
import { MoleculesService } from './molecules.service';

@Module({
  imports: [HttpModule],
  controllers: [MoleculesController],
  providers: [MoleculesService],
})
export class MoleculesModule {}
