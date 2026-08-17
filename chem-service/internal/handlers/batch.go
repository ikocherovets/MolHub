package handlers

import (
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
	"molhub/chem-service/internal/db"
)

type BatchImport struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

const maxUploadBytes = 10 << 20 // 10MB

type batchRowResult struct {
	Row      int          `json:"row"`
	OK       bool         `json:"ok"`
	Error    string       `json:"error,omitempty"`
	Molecule *db.Molecule `json:"molecule,omitempty"`
}

type batchImportResponse struct {
	Total    int              `json:"total"`
	Inserted int              `json:"inserted"`
	Failed   int              `json:"failed"`
	Rows     []batchRowResult `json:"rows"`
}

func inferFormat(filename string) string {
	if strings.HasSuffix(strings.ToLower(filename), ".sdf") {
		return "sdf"
	}
	return "csv"
}

// Create parses an uploaded SDF or CSV/SMILES-per-line file via chem-python
// (POST /batch/analyze) and stores every successfully-analyzed row, the
// same way Molecules.Create stores a single one. Rows chem-python couldn't
// parse or that failed to insert are reported back, not silently dropped.
func (h *BatchImport) Create(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or not a valid multipart form (max 10MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "multipart field \"file\" is required")
		return
	}
	defer file.Close()

	format := r.FormValue("format")
	if format == "" {
		format = inferFormat(header.Filename)
	}

	content, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read uploaded file")
		return
	}

	analyzed, err := h.ChemPy.BatchAnalyze(header.Filename, format, content)
	if err != nil {
		log.Printf("chem-python error: %v", err)
		writeError(w, http.StatusBadGateway, "cheminformatics service unavailable")
		return
	}

	rows := make([]batchRowResult, 0, len(analyzed.Rows))
	inserted := 0
	for _, row := range analyzed.Rows {
		if !row.OK {
			rows = append(rows, batchRowResult{Row: row.Row, OK: false, Error: row.Error})
			continue
		}

		dbRow := h.Pool.QueryRow(r.Context(), `
			INSERT INTO molecules (smiles, inchikey, mol, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike, fingerprint)
			VALUES ($1, $2, mol_from_smiles($1), $3, $4, $5, $6, $7, $8, $9, morganbv_fp(mol_from_smiles($1)))
			ON CONFLICT (inchikey) DO UPDATE SET smiles = EXCLUDED.smiles
			RETURNING id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike
		`, row.CanonicalSmiles, row.InChIKey, row.MW, row.LogP, row.TPSA,
			row.HDonors, row.HAcceptors, row.RingCount, row.Druglike)

		mol, err := scanMolecule(dbRow)
		if err != nil {
			log.Printf("db insert error (batch row %d): %v", row.Row, err)
			rows = append(rows, batchRowResult{Row: row.Row, OK: false, Error: "failed to store"})
			continue
		}

		inserted++
		rows = append(rows, batchRowResult{Row: row.Row, OK: true, Molecule: mol})
	}

	writeJSON(w, http.StatusOK, batchImportResponse{
		Total:    analyzed.Total,
		Inserted: inserted,
		Failed:   analyzed.Total - inserted,
		Rows:     rows,
	})
}
