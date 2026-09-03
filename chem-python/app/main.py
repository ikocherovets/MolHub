import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from sklearn.decomposition import PCA

from pydantic import BaseModel

from app import batch, chem, render
from app.ml import cluster
from app.ml.features import fingerprint
from app.ml.predict import predict_druglike

app = FastAPI(title="MolHub chem-python")


class SmilesRequest(BaseModel):
    smiles: str


class AnalyzeResponse(BaseModel):
    canonical_smiles: str
    inchikey: str
    mw: float
    logp: float
    tpsa: float
    h_donors: int
    h_acceptors: int
    ring_count: int
    druglike: bool


class DruglikePrediction(BaseModel):
    canonical_smiles: str
    predicted_druglike: bool
    probability: float
    rule_based_druglike: bool


class RenderResponse(BaseModel):
    svg: str


class BatchRow(BaseModel):
    row: int
    ok: bool
    error: str | None = None
    canonical_smiles: str | None = None
    inchikey: str | None = None
    mw: float | None = None
    logp: float | None = None
    tpsa: float | None = None
    h_donors: int | None = None
    h_acceptors: int | None = None
    ring_count: int | None = None
    druglike: bool | None = None


class BatchAnalyzeResponse(BaseModel):
    total: int
    rows: list[BatchRow]


class EmbedRequest(BaseModel):
    smiles: list[str]


class EmbedPoint(BaseModel):
    row: int
    ok: bool
    error: str | None = None
    x: float | None = None
    y: float | None = None


class EmbedResponse(BaseModel):
    points: list[EmbedPoint]
    explained_variance: list[float]


class ClusterPoint(BaseModel):
    row: int
    ok: bool
    error: str | None = None
    cluster: int | None = None


class KMeansRequest(BaseModel):
    smiles: list[str]
    k: int = 3


class KMeansResponse(BaseModel):
    points: list[ClusterPoint]
    k: int


class SomPoint(BaseModel):
    row: int
    ok: bool
    error: str | None = None
    x: int | None = None
    y: int | None = None


class SomRequest(BaseModel):
    smiles: list[str]
    grid_size: int | None = None


class SomResponse(BaseModel):
    points: list[SomPoint]
    grid_size: int


MAX_STRUCTURAL_ROWS = 2000
MIN_STRUCTURAL_ROWS = 2
MIN_K, MAX_K = 2, 8
MIN_GRID, MAX_GRID = 2, 8


def _featurize(smiles_list: list[str]) -> tuple[np.ndarray, list[int], dict[int, str]]:
    """Parses every SMILES independently (one bad row doesn't drop the rest)
    and fingerprints the valid ones, for any endpoint that needs "molecule ->
    Morgan fingerprint" over a whole request (/embed, /cluster/*)."""
    fingerprints: list[np.ndarray] = []
    valid_rows: list[int] = []
    errors: dict[int, str] = {}
    for i, smiles in enumerate(smiles_list):
        try:
            mol = chem.parse_smiles(smiles)
        except chem.InvalidSmiles:
            errors[i] = f"invalid SMILES: {smiles!r}"
            continue
        fingerprints.append(fingerprint(mol))
        valid_rows.append(i)
    matrix = np.vstack(fingerprints) if fingerprints else np.empty((0, 0))
    return matrix, valid_rows, errors


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: SmilesRequest):
    try:
        mol = chem.parse_smiles(req.smiles)
    except chem.InvalidSmiles:
        raise HTTPException(status_code=422, detail="invalid SMILES")

    return AnalyzeResponse(**chem.describe(mol))


@app.post("/predict/druglike", response_model=DruglikePrediction)
def predict(req: SmilesRequest):
    """Predicts Lipinski drug-likeness from a Morgan fingerprint alone (see
    app/ml/train.py), returned alongside the deterministic rule-based value
    from /analyze for comparison."""
    try:
        mol = chem.parse_smiles(req.smiles)
    except chem.InvalidSmiles:
        raise HTTPException(status_code=422, detail="invalid SMILES")

    descriptors = chem.describe(mol)
    predicted, probability = predict_druglike(mol)

    return DruglikePrediction(
        canonical_smiles=descriptors["canonical_smiles"],
        predicted_druglike=predicted,
        probability=round(probability, 4),
        rule_based_druglike=descriptors["druglike"],
    )


@app.post("/render", response_model=RenderResponse)
def render_molecule(req: SmilesRequest):
    try:
        mol = chem.parse_smiles(req.smiles)
    except chem.InvalidSmiles:
        raise HTTPException(status_code=422, detail="invalid SMILES")

    return RenderResponse(svg=render.render_svg(mol))


@app.post("/batch/analyze", response_model=BatchAnalyzeResponse)
async def batch_analyze(file: UploadFile = File(...), format: str = Form("csv")):
    """Extracts every molecule from an uploaded SDF or CSV/SMILES-per-line
    file and runs the same descriptor calculation as /analyze on each —
    parsing only, no storage (see chem-service's POST /molecules/batch for
    the version that also inserts into Postgres)."""
    content = await file.read()
    try:
        smiles_list = batch.parse(content, format)
    except batch.TooManyRows as err:
        raise HTTPException(status_code=413, detail=str(err))

    rows: list[BatchRow] = []
    for i, smiles in enumerate(smiles_list):
        if not smiles:
            rows.append(BatchRow(row=i, ok=False, error="could not parse molecule"))
            continue
        try:
            mol = chem.parse_smiles(smiles)
        except chem.InvalidSmiles:
            rows.append(BatchRow(row=i, ok=False, error=f"invalid SMILES: {smiles!r}"))
            continue
        rows.append(BatchRow(row=i, ok=True, **chem.describe(mol)))

    return BatchAnalyzeResponse(total=len(rows), rows=rows)


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    """Projects each molecule's Morgan fingerprint (same featurization as
    /predict/druglike, see app/ml/features.py) down to 2D with PCA — a real
    structural "chemical space" plot, as opposed to picking two descriptors
    like MW/LogP and calling the axes chemical space."""
    if len(req.smiles) > MAX_STRUCTURAL_ROWS:
        raise HTTPException(status_code=413, detail=f"more than {MAX_STRUCTURAL_ROWS} molecules")

    matrix, valid_rows, errors = _featurize(req.smiles)
    if len(valid_rows) < MIN_STRUCTURAL_ROWS:
        raise HTTPException(status_code=422, detail="need at least 2 valid molecules to compute an embedding")

    pca = PCA(n_components=2, random_state=0)
    coords = pca.fit_transform(matrix)

    points = [EmbedPoint(row=i, ok=False, error=errors[i]) for i in errors]
    for idx, row in enumerate(valid_rows):
        x, y = coords[idx]
        points.append(EmbedPoint(row=row, ok=True, x=float(x), y=float(y)))
    points.sort(key=lambda p: p.row)

    return EmbedResponse(points=points, explained_variance=[round(v, 4) for v in pca.explained_variance_ratio_])


@app.post("/cluster/kmeans", response_model=KMeansResponse)
def cluster_kmeans(req: KMeansRequest):
    """K-Means over Morgan fingerprints — a flat partition into k
    structurally-similar groups, no natural layout of its own (pair with
    /embed's PCA coordinates to visualize which cluster a point belongs to)."""
    if len(req.smiles) > MAX_STRUCTURAL_ROWS:
        raise HTTPException(status_code=413, detail=f"more than {MAX_STRUCTURAL_ROWS} molecules")
    k = max(MIN_K, min(MAX_K, req.k))

    matrix, valid_rows, errors = _featurize(req.smiles)
    if len(valid_rows) < max(MIN_STRUCTURAL_ROWS, k):
        raise HTTPException(status_code=422, detail=f"need at least {k} valid molecules to form {k} clusters")

    labels = cluster.kmeans_labels(matrix, k)

    points = [ClusterPoint(row=i, ok=False, error=errors[i]) for i in errors]
    for row, label in zip(valid_rows, labels):
        points.append(ClusterPoint(row=row, ok=True, cluster=int(label)))
    points.sort(key=lambda p: p.row)

    return KMeansResponse(points=points, k=k)


@app.post("/cluster/som", response_model=SomResponse)
def cluster_som(req: SomRequest):
    """Self-organizing map over Morgan fingerprints — unlike K-Means, every
    molecule lands on a unit in a 2D grid such that nearby units are
    structurally similar, so the grid position itself is a (coarse,
    topology-preserving) chemical space layout."""
    if len(req.smiles) > MAX_STRUCTURAL_ROWS:
        raise HTTPException(status_code=413, detail=f"more than {MAX_STRUCTURAL_ROWS} molecules")

    matrix, valid_rows, errors = _featurize(req.smiles)
    if len(valid_rows) < MIN_STRUCTURAL_ROWS:
        raise HTTPException(status_code=422, detail="need at least 2 valid molecules to train a SOM")

    grid_size = req.grid_size or cluster.default_grid_size(len(valid_rows))
    grid_size = max(MIN_GRID, min(MAX_GRID, grid_size))
    units = cluster.som_units(matrix, grid_size)

    points = [SomPoint(row=i, ok=False, error=errors[i]) for i in errors]
    for row, (col, unit_row) in zip(valid_rows, units):
        points.append(SomPoint(row=row, ok=True, x=int(col), y=int(unit_row)))
    points.sort(key=lambda p: p.row)

    return SomResponse(points=points, grid_size=grid_size)
