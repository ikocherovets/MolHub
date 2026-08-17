import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List recent API activity (audit trail)' })
  list(@Query('limit') limit?: string) {
    return this.audit.list(limit !== undefined ? Number(limit) : 50);
  }
}
