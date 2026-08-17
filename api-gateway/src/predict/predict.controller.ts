import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { PredictDruglikeDto } from './dto/predict-druglike.dto';
import { PredictService } from './predict.service';

@ApiTags('predict')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(AuditInterceptor)
@Controller('predict')
export class PredictController {
  constructor(private readonly predict: PredictService) {}

  @Post('druglike')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predict Lipinski drug-likeness from a Morgan fingerprint (QSAR-style model)' })
  druglike(@Body() dto: PredictDruglikeDto) {
    return this.predict.druglike(dto);
  }
}
