import type { ApiErrorBody, BatchImportResult, DruglikePrediction, Molecule, SimilarityResult } from './types';

// This is a portfolio demo, not a multi-tenant app, so the key is just baked
// in rather than exposed as something a visitor is expected to manage.
const API_KEY = 'demo-key-change-me';

export class ApiError extends Error {}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    const message = body?.error ?? (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ?? `Request failed (${res.status})`;
    throw new ApiError(message);
  }
  return data as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...init?.headers,
    },
  });
  return handleResponse<T>(res);
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

export function predictDruglike(smiles: string): Promise<DruglikePrediction> {
  return request<DruglikePrediction>('/predict/druglike', { method: 'POST', body: JSON.stringify({ smiles }) });
}

export function renderMolecule(smiles: string): Promise<{ svg: string }> {
  return request<{ svg: string }>('/render', { method: 'POST', body: JSON.stringify({ smiles }) });
}

export async function importMolecules(file: File, format: 'sdf' | 'csv'): Promise<BatchImportResult> {
  const body = new FormData();
  body.append('file', file);
  body.append('format', format);
  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch('/molecules/batch', { method: 'POST', headers: { 'X-API-Key': API_KEY }, body });
  return handleResponse<BatchImportResult>(res);
}
