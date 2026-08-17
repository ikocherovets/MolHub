import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { SimilaritySearchDto } from './dto/similarity-search.dto';
import { SubstructureSearchDto } from './dto/substructure-search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post('substructure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find molecules containing a SMARTS substructure' })
  substructure(@Body() dto: SubstructureSearchDto) {
    return this.search.substructure(dto);
  }

  @Post('similarity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find molecules similar to a SMILES query by Tanimoto similarity' })
  similarity(@Body() dto: SimilaritySearchDto) {
    return this.search.similarity(dto);
  }
}
