"""2D structure depiction, used by the frontend so molecules show up as
actual chemical structures instead of raw SMILES text."""

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D

WIDTH = 260
HEIGHT = 160


def render_svg(mol: Chem.Mol) -> str:
    drawer = rdMolDraw2D.MolDraw2DSVG(WIDTH, HEIGHT)
    drawer.drawOptions().clearBackground = False
    rdMolDraw2D.PrepareAndDrawMolecule(drawer, mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()
