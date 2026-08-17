"""Extracts a list of SMILES from an uploaded SDF or CSV/SMILES-per-line
file, for POST /batch/analyze. Parsing only — descriptor calculation reuses
app.chem so batch and single-molecule results can't drift apart."""

import csv
import io

from rdkit import Chem

MAX_ROWS = 500


class TooManyRows(ValueError):
    pass


def parse_sdf(content: bytes) -> list[str | None]:
    """One entry per molecule block in the file; None where RDKit couldn't
    parse that block (kept so row numbers still line up with the source
    file for error reporting)."""
    supplier = Chem.ForwardSDMolSupplier(io.BytesIO(content))
    smiles: list[str | None] = []
    for mol in supplier:
        if len(smiles) >= MAX_ROWS:
            raise TooManyRows(f"more than {MAX_ROWS} molecules")
        smiles.append(Chem.MolToSmiles(mol) if mol is not None else None)
    return smiles


def parse_delimited(content: bytes) -> list[str | None]:
    """A CSV with a "smiles" column, or one SMILES per line otherwise."""
    text = content.decode("utf-8", errors="replace")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    reader = csv.DictReader(io.StringIO(text))
    smiles_field = next(
        (f for f in (reader.fieldnames or []) if f.strip().lower() == "smiles"),
        None,
    )
    if smiles_field is not None:
        rows = [row.get(smiles_field, "").strip() or None for row in reader]
    else:
        rows = [None if line.lower() == "smiles" else line for line in lines]

    if len(rows) > MAX_ROWS:
        raise TooManyRows(f"more than {MAX_ROWS} molecules")
    return rows


def parse(content: bytes, fmt: str) -> list[str | None]:
    if fmt == "sdf":
        return parse_sdf(content)
    return parse_delimited(content)
