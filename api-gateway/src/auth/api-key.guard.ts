import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export type AuthenticatedRequest = Request & { apiClient?: string };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly clientsByKey = parseApiKeys(process.env.API_KEYS);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = request.header('x-api-key');
    if (!key) throw new UnauthorizedException('missing X-API-Key header');

    const client = this.clientsByKey.get(key);
    if (!client) throw new UnauthorizedException('invalid API key');

    request.apiClient = client;
    return true;
  }
}

// API_KEYS format: "name:key,name:key" (e.g. "demo:demo-key-change-me").
function parseApiKeys(raw: string | undefined): Map<string, string> {
  const clientsByKey = new Map<string, string>();
  for (const pair of (raw ?? '').split(',')) {
    const [name, key] = pair.split(':').map((part) => part.trim());
    if (name && key) clientsByKey.set(key, name);
  }
  return clientsByKey;
}
