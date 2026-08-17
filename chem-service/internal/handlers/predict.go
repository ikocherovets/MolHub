package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"molhub/chem-service/internal/chempy"
)

type Predict struct {
	ChemPy *chempy.Client
}

type predictDruglikeRequest struct {
	Smiles string `json:"smiles"`
}

// Druglike predicts Lipinski drug-likeness from a Morgan fingerprint alone,
// via the model chem-python trains at build time — a stateless computation,
// so unlike /molecules and /search it doesn't touch Postgres.
func (h *Predict) Druglike(w http.ResponseWriter, r *http.Request) {
	var req predictDruglikeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Smiles == "" {
		writeError(w, http.StatusBadRequest, "body must be JSON with a non-empty \"smiles\" field")
		return
	}

	prediction, err := h.ChemPy.PredictDruglike(req.Smiles)
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

	writeJSON(w, http.StatusOK, prediction)
}
