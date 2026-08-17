"""Loads the drug-likeness model trained by train.py and serves predictions
for the /predict/druglike endpoint."""

from pathlib import Path

import joblib
from rdkit import Chem

from app.ml.features import fingerprint

MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"
_model = None


def _get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def predict_druglike(mol: Chem.Mol) -> tuple[bool, float]:
    model = _get_model()
    features = fingerprint(mol).reshape(1, -1)
    # classes_ is sorted, so index 1 is True (druglike) — sklearn sorts bool
    # labels as [False, True].
    probability = float(model.predict_proba(features)[0][1])
    return probability >= 0.5, probability
