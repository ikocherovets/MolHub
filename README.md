# MolHub — Molecular Screening Platform

Backend platform for storing, searching and analyzing molecules — cheminformatics
inside a real service-oriented architecture.

## Stack

- **frontend** — React + TypeScript (Vite) + Ant Design. Talks to the api-gateway.
- **api-gateway** — NestJS (TypeScript). HTTP entrypoint, Swagger docs at `/docs`.
- **chem-service** — Go. Owns molecule storage; talks to Postgres and to chem-python.
- **chem-python** — FastAPI + RDKit. Canonicalizes SMILES, computes descriptors, and serves
  a small scikit-learn drug-likeness classifier (see [Predicting drug-likeness](#predicting-drug-likeness-qsar-demo)).
- **postgres** — PostgreSQL with the RDKit cartridge extension (structural search).

```
frontend (React) -> api-gateway (NestJS) -> chem-service (Go) -> chem-python (FastAPI/RDKit)
                                                  |
                                                  v
                                            postgres + rdkit cartridge
```

## Running locally

One command brings up the whole stack (postgres, chem-python, chem-service,
api-gateway and the frontend):

```bash
cp .env.example .env   # first time only
docker compose up --build
```

- **frontend: http://localhost:5173** — the UI. It ships with the demo API key
  (`demo-key-change-me`) already filled in, so it works out of the box.
- api-gateway: http://localhost:3000 (Swagger at `/docs`)
- chem-service: http://localhost:8080
- chem-python: http://localhost:8000

The frontend is a static React build served by nginx, which also reverse-proxies
`/molecules`, `/search`, `/health` and `/docs` to the api-gateway container — no
CORS setup or extra ports to open, one process per `docker compose up`.

### Frontend-only dev loop

For hot-reload while working on the UI, run the frontend outside Docker instead
of rebuilding the image on every change (everything else can stay in Docker):

```bash
cd frontend
npm install
npm run dev
```

This starts a Vite dev server on http://localhost:5173 that proxies API calls to
`localhost:3000`, so keep `docker compose up` running for the backend.

## Try it

`/molecules`, `/search/*` and `/audit` require an `X-API-Key` header. Keys are
configured via `API_KEYS` in `.env` (`name:key` pairs, comma-separated); the
default dev key is `demo-key-change-me`.

```bash
curl -X POST http://localhost:3000/molecules \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-change-me" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O"}'

curl -H "X-API-Key: demo-key-change-me" \
  "http://localhost:3000/molecules?druglike=true&limit=20&offset=0"

curl -X POST http://localhost:3000/search/substructure \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-change-me" \
  -d '{"smarts": "c1ccccc1"}'

curl -X POST http://localhost:3000/search/similarity \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-change-me" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O", "threshold": 0.7}'

curl -H "X-API-Key: demo-key-change-me" "http://localhost:3000/audit?limit=20"

curl -X POST http://localhost:3000/predict/druglike \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-change-me" \
  -d '{"smiles": "CC(=O)OC1=CC=CC=C1C(=O)O"}'
```

## Predicting drug-likeness (QSAR demo)

`POST /predict/druglike` is a small machine-learning add-on next to the deterministic
Lipinski rule already computed on every stored molecule: a scikit-learn `RandomForestClassifier`
trained to predict rule-of-five compliance **from a Morgan fingerprint alone**, without computing
MW/LogP/TPSA/etc at inference time — a minimal QSAR-style structure-to-property model. The
response includes both the model's prediction (with probability) and the rule-based ground
truth, so you can see where the two agree or disagree.

The model trains at `chem-python` Docker build time (`app/ml/train.py`, ~3s), on ~2,600
molecules built from a public solubility dataset plus synthetic combinations added to balance
the drug-like/non-drug-like classes — see `chem-python/data/README.md` and the docstring at the
top of `train.py` for exactly how and why. Nothing here needs the internet at build time; the
dataset is checked into the repo.

## Status

Phases 1-4 (store/read molecules, drug-likeness filter, substructure search,
similarity search) are implemented end to end, plus a React/Ant Design frontend,
API-key auth, an audit trail (`audit_log` table, `GET /audit`), and a small
drug-likeness classifier (`POST /predict/druglike`).
