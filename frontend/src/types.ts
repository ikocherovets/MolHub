export interface Molecule {
  id: string;
  smiles: string;
  mw: number | null;
  logp: number | null;
  tpsa: number | null;
  h_donors: number | null;
  h_acceptors: number | null;
  ring_count: number | null;
  druglike: boolean;
}

export interface SimilarityResult extends Molecule {
  similarity: number;
}

export interface ApiErrorBody {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}
