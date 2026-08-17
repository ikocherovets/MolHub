import type { ApiErrorBody, Molecule, SimilarityResult } from './types';

const API_KEY_STORAGE_KEY = 'molhub.apiKey';
const DEFAULT_DEV_API_KEY = 'demo-key-change-me';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? DEFAULT_DEV_API_KEY;
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getApiKey(),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    const message = body?.error ?? (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ?? `Request failed (${res.status})`;
    throw new ApiError(message);
  }
  return data as T;
}

export function listMolecules(druglikeOnly: boolean): Promise<Molecule[]> {
  const query = druglikeOnly ? '?druglike=true' : '';
  return request<Molecule[]>(`/molecules${query}`);
}

export function createMolecule(smiles: string): Promise<Molecule> {
  return request<Molecule>('/molecules', { method: 'POST', body: JSON.stringify({ smiles }) });
}

export function searchSubstructure(smarts: string): Promise<Molecule[]> {
  return request<Molecule[]>('/search/substructure', { method: 'POST', body: JSON.stringify({ smarts }) });
}

export function searchSimilarity(smiles: string, threshold: number): Promise<SimilarityResult[]> {
  return request<SimilarityResult[]>('/search/similarity', { method: 'POST', body: JSON.stringify({ smiles, threshold }) });
}
