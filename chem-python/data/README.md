# Training data

`molecules.csv` — 1,117 unique, RDKit-valid canonical SMILES extracted from the
**Delaney (ESOL) solubility dataset** [1], sourced from the [DeepChem](https://github.com/deepchem/deepchem)
project (MIT-licensed) at
`datasets/delaney-processed.csv`. Only the `smiles` column is kept; the
solubility measurements themselves aren't used — this dataset is used purely
as a pool of diverse, real, small organic molecules for `app/ml/train.py`.

See `app/ml/train.py` for how these are turned into a training set (and why
synthetic negative examples are added — the pool skews almost entirely
drug-like on its own).

[1] Delaney, J. S. *ESOL: Estimating Aqueous Solubility Directly from
    Molecular Structure*. J. Chem. Inf. Comput. Sci. 2004, 44, 3, 1000-1005.
