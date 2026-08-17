// Single source of truth for the drug-likeness explanation, reused in a
// tooltip everywhere the term appears (table header, stat tile, dashboard
// intro) so the wording can't drift between spots.
export const DRUGLIKE_EXPLANATION =
  "Lipinski's Rule of Five: a heuristic for whether a molecule's " +
  'physicochemical properties look like an orally bioavailable drug — not ' +
  'proof it is one, or that it works. A molecule passes with at most one ' +
  'violation of: MW ≤ 500, LogP ≤ 5, H-bond donors ≤ 5, H-bond acceptors ≤ 10.';
