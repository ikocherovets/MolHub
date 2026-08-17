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
cp .env.example .env   # first time only
docker compose up --build
```

- API gateway / frontend: http://localhost:3000 (Swagger at `/docs`)
- chem-service: http://localhost:8080
- chem-python: http://localhost:8000

## Try it

```bash
curl -X POST http://localhost:3000/molecules \
  -H "Content-Type: application/json" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O"}'

curl "http://localhost:3000/molecules?druglike=true&limit=20&offset=0"

curl -X POST http://localhost:3000/search/substructure \
  -H "Content-Type: application/json" \
  -d '{"smarts": "c1ccccc1"}'

curl -X POST http://localhost:3000/search/similarity \
  -H "Content-Type: application/json" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O", "threshold": 0.7}'
```

## Status

Phases 1-4 (store/read molecules, drug-likeness filter, substructure search,
similarity search) are implemented end to end, plus a bare-bones frontend.
Analytics cron and auth/audit are next.
