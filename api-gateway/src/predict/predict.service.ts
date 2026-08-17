import { HttpService } from '@nestjs/axios';
import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PredictDruglikeDto } from './dto/predict-druglike.dto';

@Injectable()
export class PredictService {
  private readonly baseUrl = process.env.CHEM_SERVICE_URL ?? 'http://localhost:8080';

  constructor(private readonly http: HttpService) {}

  async druglike(dto: PredictDruglikeDto) {
    return this.forward(() => this.http.post(`${this.baseUrl}/predict/druglike`, dto));
  }

  private async forward<T>(call: () => ReturnType<HttpService['request']>) {
    try {
      const response = await firstValueFrom(call());
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        throw new HttpException(axiosErr.response.data ?? axiosErr.message, axiosErr.response.status);
      }
      throw new BadGatewayException('chem-service unavailable');
    }
  }
}
