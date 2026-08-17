"""Descriptor calculation shared by the /analyze endpoint and the
drug-likeness model's training labels, so the two can't drift apart."""

from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, inchi


class InvalidSmiles(ValueError):
    pass


def parse_smiles(smiles: str) -> Chem.Mol:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise InvalidSmiles(smiles)
    return mol


def describe(mol: Chem.Mol) -> dict:
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

    return {
        "canonical_smiles": Chem.MolToSmiles(mol, canonical=True),
        "inchikey": inchi.MolToInchiKey(mol),
        "mw": round(mw, 2),
        "logp": round(logp, 2),
        "tpsa": round(tpsa, 2),
        "h_donors": h_donors,
        "h_acceptors": h_acceptors,
        "ring_count": ring_count,
        "druglike": violations <= 1,
    }
