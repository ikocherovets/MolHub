package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
)

type Cluster struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

type clusterPoint struct {
	ID      int64  `json:"id"`
	OK      bool   `json:"ok"`
	Error   string `json:"error,omitempty"`
	Cluster *int   `json:"cluster,omitempty"`
}

type kmeansResponse struct {
	Points []clusterPoint `json:"points"`
	K      int            `json:"k"`
}

const defaultK = 3

// KMeans partitions every stored molecule's Morgan fingerprint into k
// structurally-similar groups (see chem-python's POST /cluster/kmeans).
// Pair with GET /molecules/space to visualize which cluster a point falls
// into on the PCA layout.
func (h *Cluster) KMeans(w http.ResponseWriter, r *http.Request) {
	ids, smiles, ok := fetchIDsAndSmiles(w, r, h.Pool)
	if !ok {
		return
	}

	k := defaultK
	if v := r.URL.Query().Get("k"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 2 {
			writeError(w, http.StatusBadRequest, "k must be an integer >= 2")
			return
		}
		k = parsed
	}

	if len(ids) < k {
		writeError(w, http.StatusUnprocessableEntity, "need at least k stored molecules to form k clusters")
		return
	}

	clustered, err := h.ChemPy.KMeans(smiles, k)
	if err != nil {
		log.Printf("chem-python error: %v", err)
		writeError(w, http.StatusBadGateway, "cheminformatics service unavailable")
		return
	}

	points := make([]clusterPoint, len(clustered.Points))
	for i, p := range clustered.Points {
		points[i] = clusterPoint{ID: ids[i], OK: p.OK, Error: p.Error, Cluster: p.Cluster}
	}

	writeJSON(w, http.StatusOK, kmeansResponse{Points: points, K: clustered.K})
}

type somPoint struct {
	ID    int64  `json:"id"`
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
	X     *int   `json:"x,omitempty"`
	Y     *int   `json:"y,omitempty"`
}

type somResponse struct {
	Points   []somPoint `json:"points"`
	GridSize int        `json:"grid_size"`
}

// SOM places every stored molecule's Morgan fingerprint on a self-organizing
// map (see chem-python's POST /cluster/som) — a topology-preserving grid
// layout, unlike KMeans's flat cluster labels.
func (h *Cluster) SOM(w http.ResponseWriter, r *http.Request) {
	ids, smiles, ok := fetchIDsAndSmiles(w, r, h.Pool)
	if !ok {
		return
	}

	if len(ids) < 2 {
		writeError(w, http.StatusUnprocessableEntity, "need at least 2 stored molecules to train a SOM")
		return
	}

	gridSize := 0
	if v := r.URL.Query().Get("grid"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 2 {
			writeError(w, http.StatusBadRequest, "grid must be an integer >= 2")
			return
		}
		gridSize = parsed
	}

	mapped, err := h.ChemPy.SOM(smiles, gridSize)
	if err != nil {
		log.Printf("chem-python error: %v", err)
		writeError(w, http.StatusBadGateway, "cheminformatics service unavailable")
		return
	}

	points := make([]somPoint, len(mapped.Points))
	for i, p := range mapped.Points {
		points[i] = somPoint{ID: ids[i], OK: p.OK, Error: p.Error, X: p.X, Y: p.Y}
	}

	writeJSON(w, http.StatusOK, somResponse{Points: points, GridSize: mapped.GridSize})
}
