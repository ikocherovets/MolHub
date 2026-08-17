"""
Trains a small drug-likeness classifier: predict Lipinski rule-of-five
compliance directly from a Morgan fingerprint, without computing MW/LogP/etc
at inference time. This is a QSAR-style demo (structure -> property), not a
production model.

Base molecules come from ../../data/molecules.csv (see data/README.md for
provenance) — a pool of ~1,100 real, small organic molecules. That pool skews
almost entirely drug-like (>98%), so on its own it can't teach a classifier
to recognise rule violations. To get a meaningful negative class, we
deterministically combine 2-4 pool molecules into multi-fragment SMILES (e.g.
"CCO.c1ccccc1"); summed MW/H-bond counts push most combos over the Lipinski
thresholds. This is a synthetic augmentation, not real chemistry — it's
documented here so the negative class is never mistaken for real compounds.

Run at Docker build time (see ../../Dockerfile) so the built image always
ships a model trained on exactly this code + data. To retrain manually:

    python -m app.ml.train
"""

import csv
import random
from pathlib import Path

import joblib
from rdkit import Chem
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

from app import chem
from app.ml.features import fingerprint

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "molecules.csv"
MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"
RANDOM_SEED = 42
N_SYNTHETIC_COMBOS = 1500


def load_pool() -> list[str]:
    with DATA_PATH.open() as f:
        return [row["smiles"] for row in csv.DictReader(f)]


def synthetic_combos(pool: list[str], rng: random.Random, n: int) -> list[str]:
    """Multi-fragment SMILES combining 2-4 pool molecules, used only to
    generate rule-violating (non-drug-like) training examples."""
    return [".".join(rng.sample(pool, rng.choice([2, 2, 3, 3, 4]))) for _ in range(n)]


def build_dataset(pool: list[str], rng: random.Random):
    smiles_list = pool + synthetic_combos(pool, rng, N_SYNTHETIC_COMBOS)

    features, labels = [], []
    for smiles in smiles_list:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            continue
        features.append(fingerprint(mol))
        labels.append(chem.describe(mol)["druglike"])
    return features, labels


def main():
    rng = random.Random(RANDOM_SEED)
    pool = load_pool()
    X, y = build_dataset(pool, rng)
    print(f"dataset: {len(X)} molecules ({sum(y)} drug-like, {len(y) - sum(y)} not)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(f"train={len(X_train)} test={len(X_test)}")
    print(f"accuracy={accuracy_score(y_test, y_pred):.3f}")
    print(f"precision={precision_score(y_test, y_pred):.3f}")
    print(f"recall={recall_score(y_test, y_pred):.3f}")
    print(f"f1={f1_score(y_test, y_pred):.3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
