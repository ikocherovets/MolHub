# MolHub frontend

React + TypeScript UI for MolHub, built with [Vite](https://vite.dev) and
[Ant Design](https://ant.design). It's a thin client over the `api-gateway`
REST API — no state beyond what's on screen and the API key in
`localStorage`.

## What it does

Four tabs, each a thin wrapper around one part of the API:

- **Molecules** — add a molecule by its SMILES string (MW, LogP, TPSA, H-bond
  donors/acceptors, ring count and Lipinski drug-likeness are computed
  server-side), list stored molecules, optionally filtered to drug-like only.
- **Substructure search** — find stored molecules that contain a given SMARTS
  pattern (e.g. `c1ccccc1` for a benzene ring).
- **Similarity search** — rank stored molecules by Tanimoto similarity
  (Morgan fingerprint) to a query SMILES, above a chosen threshold.
- **Predict (ML)** — run a SMILES through a small scikit-learn model that
  predicts Lipinski drug-likeness from its Morgan fingerprint alone, shown
  next to the deterministic rule-based value for comparison. See the
  [root README](../README.md#predicting-drug-likeness-qsar-demo) for how the
  model is trained.

Every request needs an **API key**, sent as the `X-API-Key` header — set it in
the field at the top-right of the page. It's kept in the browser's
`localStorage` (key `molhub.apiKey`) so it survives reloads, and defaults to
the demo key `demo-key-change-me` the first time you open the app.

## Running it

You normally don't need to run this directly — `docker compose up --build`
from the repo root builds and serves it (via nginx) as part of the whole
stack, at `http://localhost:5173`. See the [root README](../README.md).

Use the commands below only when iterating on the UI itself and you want
hot-reload instead of rebuilding the Docker image on every change:

```bash
npm install
npm run dev
```

This starts a Vite dev server at `http://localhost:5173` that proxies
`/molecules`, `/search`, `/predict`, `/health` and `/docs` to
`http://localhost:3000` (configurable via `VITE_API_PROXY_TARGET`), so the
`api-gateway` container (or a local `npm run start:dev` in `../api-gateway`)
needs to be running separately.

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint      # oxlint
```

## Project layout

```
src/
  api.ts                    fetch wrapper: adds X-API-Key, unwraps errors
  types.ts                  Molecule / SimilarityResult / DruglikePrediction shapes
  App.tsx                   layout + tabs
  components/
    ApiKeyBar.tsx            API key input (top-right)
    MoleculesPanel.tsx       add + list molecules
    SubstructurePanel.tsx    SMARTS substructure search
    SimilarityPanel.tsx      Tanimoto similarity search
    PredictPanel.tsx         ML drug-likeness prediction
    MoleculeTable.tsx        shared results table
```

Talking to a different backend? Point `VITE_API_PROXY_TARGET` at it for the
dev server, or edit `nginx.conf` for the Docker build — the app itself only
ever calls relative paths (`/molecules`, `/search/...`), so it doesn't need
to know the backend's origin.
