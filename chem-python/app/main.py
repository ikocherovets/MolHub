from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, inchi

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: SmilesRequest):
    mol = Chem.MolFromSmiles(req.smiles)
    if mol is None:
        raise HTTPException(status_code=422, detail="invalid SMILES")

    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    tpsa = Descriptors.TPSA(mol)
    h_donors = Lipinski.NumHDonors(mol)
    h_acceptors = Lipinski.NumHAcceptors(mol)
    ring_count = Lipinski.RingCount(mol)

    # Lipinski's Rule of Five: at most one violation allowed
    violations = sum([
        mw > 500,
        logp > 5,
        h_donors > 5,
        h_acceptors > 10,
    ])

    return AnalyzeResponse(
        canonical_smiles=Chem.MolToSmiles(mol, canonical=True),
        inchikey=inchi.MolToInchiKey(mol),
        mw=round(mw, 2),
        logp=round(logp, 2),
        tpsa=round(tpsa, 2),
        h_donors=h_donors,
        h_acceptors=h_acceptors,
        ring_count=ring_count,
        druglike=violations <= 1,
    )
