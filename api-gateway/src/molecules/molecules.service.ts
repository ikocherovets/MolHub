import { HttpService } from '@nestjs/axios';
import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CreateMoleculeDto } from './dto/create-molecule.dto';

@Injectable()
export class MoleculesService {
  private readonly baseUrl = process.env.CHEM_SERVICE_URL ?? 'http://localhost:8080';

  constructor(private readonly http: HttpService) {}

  async create(dto: CreateMoleculeDto) {
    return this.forward(() => this.http.post(`${this.baseUrl}/molecules`, dto));
  }

  async list(druglike: boolean, limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (druglike) params.set('druglike', 'true');
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.forward(() => this.http.get(`${this.baseUrl}/molecules${query}`));
  }

  async get(id: string) {
    return this.forward(() => this.http.get(`${this.baseUrl}/molecules/${id}`));
  }

  async space() {
    return this.forward(() => this.http.get(`${this.baseUrl}/molecules/space`));
  }

  async kmeans(k?: number) {
    const query = k !== undefined ? `?k=${k}` : '';
    return this.forward(() => this.http.get(`${this.baseUrl}/molecules/cluster/kmeans${query}`));
  }

  async som(gridSize?: number) {
    const query = gridSize !== undefined ? `?grid=${gridSize}` : '';
    return this.forward(() => this.http.get(`${this.baseUrl}/molecules/cluster/som${query}`));
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
