from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from pydantic import BaseModel

from app import batch, chem, render
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
