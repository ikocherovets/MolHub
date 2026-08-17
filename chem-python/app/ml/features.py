"""Morgan-fingerprint featurization shared by training and inference — a
change here can't silently desync the model from what /predict/druglike
sends it, since both go through this one function."""

import numpy as np
from rdkit import Chem
from rdkit.Chem import rdFingerprintGenerator

RADIUS = 2
N_BITS = 1024

_generator = rdFingerprintGenerator.GetMorganGenerator(radius=RADIUS, fpSize=N_BITS)


def fingerprint(mol: Chem.Mol) -> np.ndarray:
    # Count (not bit) fingerprint, so e.g. a dimer's doubled substructure
    # counts are visible to the model, not indistinguishable from a monomer.
    return _generator.GetCountFingerprintAsNumPy(mol).astype(np.int32)
