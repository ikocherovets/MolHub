package handlers

import (
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
)

type Space struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

type spacePoint struct {
	ID    int64    `json:"id"`
	OK    bool     `json:"ok"`
	Error string   `json:"error,omitempty"`
	X     *float64 `json:"x,omitempty"`
	Y     *float64 `json:"y,omitempty"`
}

type spaceResponse struct {
	Points            []spacePoint `json:"points"`
	ExplainedVariance []float64    `json:"explained_variance"`
}

// fetchIDsAndSmiles loads every stored molecule's id + SMILES, capped at
// maxListLimit (same as GET /molecules) — the shared input for any handler
// that hands the whole library to chem-python for a structural computation
// (PCA embedding, clustering).
func fetchIDsAndSmiles(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) (ids []int64, smiles []string, ok bool) {
	rows, err := pool.Query(r.Context(), `SELECT id, smiles FROM molecules ORDER BY id DESC LIMIT $1`, maxListLimit)
	if err != nil {
		log.Printf("db query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list molecules")
		return nil, nil, false
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var s string
		if err := rows.Scan(&id, &s); err != nil {
			log.Printf("db scan error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to list molecules")
			return nil, nil, false
		}
		ids = append(ids, id)
		smiles = append(smiles, s)
	}
	return ids, smiles, true
}

// Embed returns a 2D PCA projection of every stored molecule's Morgan
// fingerprint (see chem-python's POST /embed), for a "structural" chemical
// space view distinct from the app's default LogP-vs-MW descriptor scatter.
// Capped at maxListLimit molecules, same as GET /molecules.
func (h *Space) Embed(w http.ResponseWriter, r *http.Request) {
	ids, smiles, ok := fetchIDsAndSmiles(w, r, h.Pool)
	if !ok {
		return
	}

	if len(ids) < 2 {
		writeError(w, http.StatusUnprocessableEntity, "need at least 2 stored molecules to compute an embedding")
		return
	}

	embedded, err := h.ChemPy.Embed(smiles)
	if err != nil {
		log.Printf("chem-python error: %v", err)
		writeError(w, http.StatusBadGateway, "cheminformatics service unavailable")
		return
	}

	points := make([]spacePoint, len(embedded.Points))
	for i, p := range embedded.Points {
		points[i] = spacePoint{ID: ids[i], OK: p.OK, Error: p.Error, X: p.X, Y: p.Y}
	}

	writeJSON(w, http.StatusOK, spaceResponse{Points: points, ExplainedVariance: embedded.ExplainedVariance})
}
