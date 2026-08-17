import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { BatchImportService } from './batch-import.service';

@ApiTags('molecules')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
@Controller('molecules')
export class BatchImportController {
  constructor(private readonly batchImport: BatchImportService) {}

  @Post('batch')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        format: { type: 'string', enum: ['sdf', 'csv'], description: 'Defaults to inferring from the filename extension' },
      },
    },
  })
  @ApiOperation({ summary: 'Bulk-import molecules from an SDF or CSV/SMILES-per-line file (max 10MB, 500 molecules)' })
  importBatch(@UploadedFile() file: Express.Multer.File, @Body('format') format?: string) {
    if (!file) throw new BadRequestException('multipart field "file" is required');
    return this.batchImport.importBatch(file, format);
  }
}
