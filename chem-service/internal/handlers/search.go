package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
	"molhub/chem-service/internal/db"
)

type Search struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

type substructureRequest struct {
	Smarts string `json:"smarts"`
}

// Substructure finds molecules that contain the given SMARTS pattern,
// using the RDKit cartridge's substructure containment operator (@>).
func (h *Search) Substructure(w http.ResponseWriter, r *http.Request) {
	var req substructureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Smarts == "" {
		writeError(w, http.StatusBadRequest, "body must be JSON with a non-empty \"smarts\" field")
		return
	}

	// The RDKit cartridge returns NULL (not an error) for a malformed SMARTS,
	// so a bad pattern would otherwise look identical to "zero matches".
	var valid bool
	err := h.Pool.QueryRow(r.Context(), `SELECT qmol_from_smarts($1) IS NOT NULL`, req.Smarts).Scan(&valid)
	if err != nil {
		log.Printf("smarts validation error: %v", err)
		writeError(w, http.StatusUnprocessableEntity, "invalid SMARTS pattern")
		return
	}
	if !valid {
		writeError(w, http.StatusUnprocessableEntity, "invalid SMARTS pattern")
		return
	}

	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike
		FROM molecules
		WHERE mol @> qmol_from_smarts($1)
		ORDER BY id
		LIMIT 100
	`, req.Smarts)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid SMARTS pattern")
		return
	}
	defer rows.Close()

	molecules := []db.Molecule{}
	for rows.Next() {
		mol, err := scanMolecule(rows)
		if err != nil {
			log.Printf("substructure scan error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to run substructure search")
			return
		}
		molecules = append(molecules, *mol)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid SMARTS pattern")
		return
	}

	writeJSON(w, http.StatusOK, molecules)
}

type similarityRequest struct {
	Smiles    string  `json:"smiles"`
	Threshold float64 `json:"threshold"`
}

type moleculeWithSimilarity struct {
	db.Molecule
	Similarity float64 `json:"similarity"`
}

// Similarity ranks stored molecules by Tanimoto similarity of their Morgan
// fingerprint against the fingerprint of the query SMILES.
func (h *Search) Similarity(w http.ResponseWriter, r *http.Request) {
	var req similarityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Smiles == "" {
		writeError(w, http.StatusBadRequest, "body must be JSON with a non-empty \"smiles\" field")
		return
	}

	threshold := req.Threshold
	if threshold == 0 {
		threshold = 0.7
	}
	if threshold < 0 || threshold > 1 {
		writeError(w, http.StatusBadRequest, "threshold must be between 0 and 1")
		return
	}

	analysis, err := h.ChemPy.Analyze(req.Smiles)
	if err != nil {
		var invalid *chempy.ErrInvalidSmiles
		if errors.As(err, &invalid) {
			writeError(w, http.StatusUnprocessableEntity, invalid.Error())
			return
		}
		log.Printf("chem-python error: %v", err)
		writeError(w, http.StatusBadGateway, "cheminformatics service unavailable")
		return
	}

	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike,
		       tanimoto_sml(fingerprint, morganbv_fp(mol_from_smiles($1))) AS similarity
		FROM molecules
		WHERE tanimoto_sml(fingerprint, morganbv_fp(mol_from_smiles($1))) >= $2
		ORDER BY similarity DESC
		LIMIT 100
	`, analysis.CanonicalSmiles, threshold)
	if err != nil {
		log.Printf("similarity query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to run similarity search")
		return
	}
	defer rows.Close()

	results := []moleculeWithSimilarity{}
	for rows.Next() {
		var m moleculeWithSimilarity
		err := rows.Scan(&m.ID, &m.Smiles, &m.InChIKey, &m.MW, &m.LogP, &m.TPSA,
			&m.HDonors, &m.HAcceptors, &m.RingCount, &m.Druglike, &m.Similarity)
		if err != nil {
			log.Printf("similarity scan error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to run similarity search")
			return
		}
		m.Similarity = math.Round(m.Similarity*1000) / 1000
		results = append(results, m)
	}

	writeJSON(w, http.StatusOK, results)
}
