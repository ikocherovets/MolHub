-- MolHub schema
-- Requires the RDKit PostgreSQL cartridge extension (baked into the postgres image).

CREATE EXTENSION IF NOT EXISTS rdkit;

CREATE TABLE IF NOT EXISTS molecules (
    id              BIGSERIAL PRIMARY KEY,
    smiles          TEXT NOT NULL,              -- canonical SMILES as returned by RDKit
    inchikey        TEXT NOT NULL UNIQUE,
    mol             mol NOT NULL,                -- RDKit cartridge molecule column
    mw              DOUBLE PRECISION,
    logp            DOUBLE PRECISION,
    tpsa            DOUBLE PRECISION,
    h_donors        INTEGER,
    h_acceptors     INTEGER,
    ring_count      INTEGER,
    druglike        BOOLEAN NOT NULL DEFAULT FALSE, -- Lipinski Rule of Five
    fingerprint     bfp,                         -- RDKit Morgan fingerprint (binary fingerprint)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Structural search indexes (RDKit cartridge)
CREATE INDEX IF NOT EXISTS molecules_mol_idx ON molecules USING gist (mol);
CREATE INDEX IF NOT EXISTS molecules_fingerprint_idx ON molecules USING gist (fingerprint);
CREATE INDEX IF NOT EXISTS molecules_druglike_idx ON molecules (druglike);

-- Audit trail: owned by api-gateway (cross-cutting, not a chem-service concern).
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    api_client      TEXT NOT NULL,              -- name resolved from the caller's API key
    method          TEXT NOT NULL,
    path            TEXT NOT NULL,
    status_code     INTEGER NOT NULL,
    ip              TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
