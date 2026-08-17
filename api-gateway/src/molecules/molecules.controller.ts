import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MoleculesService } from './molecules.service';
import { CreateMoleculeDto } from './dto/create-molecule.dto';

@ApiTags('molecules')
@Controller('molecules')
export class MoleculesController {
  constructor(private readonly molecules: MoleculesService) {}

  @Post()
  @ApiOperation({ summary: 'Store a molecule from a SMILES string' })
  create(@Body() dto: CreateMoleculeDto) {
    return this.molecules.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List stored molecules, optionally filtered by drug-likeness' })
  list(
    @Query('druglike') druglike?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.molecules.list(
      druglike === 'true',
      limit !== undefined ? Number(limit) : undefined,
      offset !== undefined ? Number(offset) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a molecule with its computed descriptors' })
  get(@Param('id') id: string) {
    return this.molecules.get(id);
  }
}
