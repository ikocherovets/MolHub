import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { RenderMoleculeDto } from './dto/render-molecule.dto';
import { RenderService } from './render.service';

@ApiTags('render')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
@Controller('render')
export class RenderController {
  constructor(private readonly render: RenderService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render a 2D structure depiction (SVG) for a SMILES string' })
  molecule(@Body() dto: RenderMoleculeDto) {
    return this.render.molecule(dto);
  }
}
