import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { MoleculesService } from './molecules.service';
import { CreateMoleculeDto } from './dto/create-molecule.dto';

@ApiTags('molecules')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
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

  @Get('space')
  @ApiOperation({ summary: 'PCA projection of every stored molecule\'s fingerprint, for a structural chemical-space view' })
  space() {
    return this.molecules.space();
  }

  @Get('cluster/kmeans')
  @ApiOperation({ summary: 'K-Means clustering of every stored molecule\'s fingerprint into k structurally-similar groups' })
  kmeans(@Query('k') k?: string) {
    return this.molecules.kmeans(k !== undefined ? Number(k) : undefined);
  }

  @Get('cluster/som')
  @ApiOperation({ summary: 'Self-organizing map placing every stored molecule on a topology-preserving grid' })
  som(@Query('grid') grid?: string) {
    return this.molecules.som(grid !== undefined ? Number(grid) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a molecule with its computed descriptors' })
  get(@Param('id') id: string) {
    return this.molecules.get(id);
  }
}
