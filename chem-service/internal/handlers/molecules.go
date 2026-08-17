package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
	"molhub/chem-service/internal/db"
)

type Molecules struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

type createMoleculeRequest struct {
	Smiles string `json:"smiles"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (h *Molecules) Create(w http.ResponseWriter, r *http.Request) {
	var req createMoleculeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Smiles == "" {
		writeError(w, http.StatusBadRequest, "body must be JSON with a non-empty \"smiles\" field")
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

	row := h.Pool.QueryRow(r.Context(), `
		INSERT INTO molecules (smiles, inchikey, mol, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike, fingerprint)
		VALUES ($1, $2, mol_from_smiles($1), $3, $4, $5, $6, $7, $8, $9, morganbv_fp(mol_from_smiles($1)))
		ON CONFLICT (inchikey) DO UPDATE SET smiles = EXCLUDED.smiles
		RETURNING id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike
	`, analysis.CanonicalSmiles, analysis.InChIKey, analysis.MW, analysis.LogP, analysis.TPSA,
		analysis.HDonors, analysis.HAcceptors, analysis.RingCount, analysis.Druglike)

	mol, err := scanMolecule(row)
	if err != nil {
		log.Printf("db insert error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to store molecule")
		return
	}

	writeJSON(w, http.StatusCreated, mol)
}

func (h *Molecules) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id must be an integer")
		return
	}

	row := h.Pool.QueryRow(r.Context(), `
		SELECT id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike
		FROM molecules WHERE id = $1
	`, id)

	mol, err := scanMolecule(row)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "molecule not found")
		return
	}
	if err != nil {
		log.Printf("db query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch molecule")
		return
	}

	writeJSON(w, http.StatusOK, mol)
}

const (
	defaultListLimit = 100
	maxListLimit     = 500
)

func (h *Molecules) List(w http.ResponseWriter, r *http.Request) {
	limit := defaultListLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 {
			writeError(w, http.StatusBadRequest, "limit must be a positive integer")
			return
		}
		if parsed > maxListLimit {
			parsed = maxListLimit
		}
		limit = parsed
	}

	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			writeError(w, http.StatusBadRequest, "offset must be a non-negative integer")
			return
		}
		offset = parsed
	}

	query := `SELECT id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike FROM molecules`
	if r.URL.Query().Get("druglike") == "true" {
		query += ` WHERE druglike = true`
	}
	query += ` ORDER BY id DESC LIMIT $1 OFFSET $2`

	rows, err := h.Pool.Query(r.Context(), query, limit, offset)
	if err != nil {
		log.Printf("db query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list molecules")
		return
	}
	defer rows.Close()

	molecules := []db.Molecule{}
	for rows.Next() {
		mol, err := scanMolecule(rows)
		if err != nil {
			log.Printf("db scan error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to list molecules")
			return
		}
		molecules = append(molecules, *mol)
	}

	writeJSON(w, http.StatusOK, molecules)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanMolecule(row rowScanner) (*db.Molecule, error) {
	var m db.Molecule
	err := row.Scan(&m.ID, &m.Smiles, &m.InChIKey, &m.MW, &m.LogP, &m.TPSA, &m.HDonors, &m.HAcceptors, &m.RingCount, &m.Druglike)
	if err != nil {
		return nil, err
	}
	return &m, nil
}
