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

export interface DruglikePrediction {
  canonical_smiles: string;
  predicted_druglike: boolean;
  probability: number;
  rule_based_druglike: boolean;
}

export interface ApiErrorBody {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}

export interface BatchRowResult {
  row: number;
  ok: boolean;
  error?: string;
  molecule?: Molecule;
}

export interface BatchImportResult {
  total: number;
  inserted: number;
  failed: number;
  rows: BatchRowResult[];
}
