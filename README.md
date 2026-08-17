# MolHub — Molecular Screening Platform

Backend platform for storing, searching and analyzing molecules — cheminformatics
inside a real service-oriented architecture.

## Stack

- **api-gateway** — NestJS (TypeScript). HTTP entrypoint, Swagger docs at `/docs`.
- **chem-service** — Go. Owns molecule storage; talks to Postgres and to chem-python.
- **chem-python** — FastAPI + RDKit. Canonicalizes SMILES and computes descriptors.
- **postgres** — PostgreSQL with the RDKit cartridge extension (structural search).

```
client -> api-gateway (NestJS) -> chem-service (Go) -> chem-python (FastAPI/RDKit)
                                        |
                                        v
                                  postgres + rdkit cartridge
```

## Running locally

```bash
docker compose up --build
```

- API gateway: http://localhost:3000 (Swagger at `/docs`)
- chem-service: http://localhost:8080
- chem-python: http://localhost:8000

## Try it

```bash
curl -X POST http://localhost:3000/molecules \
  -H "Content-Type: application/json" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O"}'

curl http://localhost:3000/molecules?druglike=true
```

## Status

Phase 1 (store & read molecules with computed descriptors) is implemented end to end.
Substructure search, similarity search, analytics cron and auth/audit are next.
