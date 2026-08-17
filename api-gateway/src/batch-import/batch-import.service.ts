import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class BatchImportService {
  private readonly baseUrl = process.env.CHEM_SERVICE_URL ?? 'http://localhost:8080';

  async importBatch(file: Express.Multer.File, format?: string) {
    const detectedFormat = format || inferFormat(file.originalname);

    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);
    body.append('format', detectedFormat);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/molecules/batch`, { method: 'POST', body });
    } catch {
      throw new BadGatewayException('chem-service unavailable');
    }

    const data = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new HttpException(data ?? 'batch import failed', response.status);
    }
    return data;
  }
}

function inferFormat(filename: string): string {
  return filename.toLowerCase().endsWith('.sdf') ? 'sdf' : 'csv';
}
