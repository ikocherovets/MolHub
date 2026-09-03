package handlers

import (
	"io"
	"log"
	"net/http"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"molhub/chem-service/internal/chempy"
	"molhub/chem-service/internal/db"
)

type BatchImport struct {
	Pool   *pgxpool.Pool
	ChemPy *chempy.Client
}

const maxUploadBytes = 10 << 20 // 10MB

// insertBatchSize caps how many molecules go into one pipelined DB round
// trip. pgx runs a Batch as a single implicit transaction, so one row that
// fails to insert would roll back every insert in the batch — this bounds
// how many good inserts are ever at risk (and how many rows need a solo
// retry) without giving up the big win for the common case, where a
// thousand-row import that used to mean a thousand sequential round trips
// becomes ten.
const insertBatchSize = 100

const insertMoleculeSQL = `
	INSERT INTO molecules (smiles, inchikey, mol, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike, fingerprint)
	VALUES ($1, $2, mol_from_smiles($1), $3, $4, $5, $6, $7, $8, $9, morganbv_fp(mol_from_smiles($1)))
	ON CONFLICT (inchikey) DO UPDATE SET smiles = EXCLUDED.smiles
	RETURNING id, smiles, inchikey, mw, logp, tpsa, h_donors, h_acceptors, ring_count, druglike
`

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
	valid := make([]chempy.BatchRow, 0, len(analyzed.Rows))
	for _, row := range analyzed.Rows {
		if row.OK {
			valid = append(valid, row)
		} else {
			rows = append(rows, batchRowResult{Row: row.Row, OK: false, Error: row.Error})
		}
	}

	inserted := 0
	for start := 0; start < len(valid); start += insertBatchSize {
		chunk := valid[start:min(start+insertBatchSize, len(valid))]
		chunkRows, chunkInserted := h.insertChunk(r, chunk)
		rows = append(rows, chunkRows...)
		inserted += chunkInserted
	}

	sort.Slice(rows, func(i, j int) bool { return rows[i].Row < rows[j].Row })

	writeJSON(w, http.StatusOK, batchImportResponse{
		Total:    analyzed.Total,
		Inserted: inserted,
		Failed:   analyzed.Total - inserted,
		Rows:     rows,
	})
}

// insertChunk stores a chunk of already-analyzed, valid rows with a single
// pipelined round trip to Postgres. Because pgx runs a Batch as one implicit
// transaction, a row that fails to insert (e.g. one the Postgres RDKit
// extension rejects even though chem-python's RDKit parsed it fine) rolls
// back every insert queued alongside it — when that happens the whole chunk
// is retried one row at a time so a single bad row can't take good
// molecules down with it, and so each row's own error is reported instead
// of a shared one.
func (h *BatchImport) insertChunk(r *http.Request, chunk []chempy.BatchRow) ([]batchRowResult, int) {
	batch := &pgx.Batch{}
	for _, row := range chunk {
		batch.Queue(insertMoleculeSQL, row.CanonicalSmiles, row.InChIKey, row.MW, row.LogP, row.TPSA,
			row.HDonors, row.HAcceptors, row.RingCount, row.Druglike)
	}

	br := h.Pool.SendBatch(r.Context(), batch)
	molecules := make([]*db.Molecule, len(chunk))
	chunkFailed := false
	for i := range chunk {
		mol, err := scanMolecule(br.QueryRow())
		if err != nil {
			chunkFailed = true
			continue
		}
		molecules[i] = mol
	}
	if err := br.Close(); err != nil {
		chunkFailed = true
	}

	results := make([]batchRowResult, len(chunk))
	inserted := 0

	if !chunkFailed {
		for i, row := range chunk {
			results[i] = batchRowResult{Row: row.Row, OK: true, Molecule: molecules[i]}
			inserted++
		}
		return results, inserted
	}

	for i, row := range chunk {
		dbRow := h.Pool.QueryRow(r.Context(), insertMoleculeSQL, row.CanonicalSmiles, row.InChIKey, row.MW,
			row.LogP, row.TPSA, row.HDonors, row.HAcceptors, row.RingCount, row.Druglike)
		mol, err := scanMolecule(dbRow)
		if err != nil {
			log.Printf("db insert error (batch row %d): %v", row.Row, err)
			results[i] = batchRowResult{Row: row.Row, OK: false, Error: "failed to store"}
			continue
		}
		inserted++
		results[i] = batchRowResult{Row: row.Row, OK: true, Molecule: mol}
	}
	return results, inserted
}
