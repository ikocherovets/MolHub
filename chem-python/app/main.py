from fastapi import FastAPI, HTTPException

from pydantic import BaseModel

from app import chem, render
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
