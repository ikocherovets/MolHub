package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"molhub/chem-service/internal/chempy"
)

type Render struct {
	ChemPy *chempy.Client
}

type renderRequest struct {
	Smiles string `json:"smiles"`
}

// Molecule renders a 2D structure depiction (SVG) for a SMILES string —
// stateless, like /predict/druglike.
func (h *Render) Molecule(w http.ResponseWriter, r *http.Request) {
	var req renderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Smiles == "" {
		writeError(w, http.StatusBadRequest, "body must be JSON with a non-empty \"smiles\" field")
		return
	}

	result, err := h.ChemPy.Render(req.Smiles)
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

	writeJSON(w, http.StatusOK, result)
}
