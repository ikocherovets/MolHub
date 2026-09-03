package chempy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

// ErrInvalidSmiles is returned when chem-python rejects the input SMILES.
type ErrInvalidSmiles struct{ Smiles string }

func (e *ErrInvalidSmiles) Error() string {
	return fmt.Sprintf("invalid SMILES: %q", e.Smiles)
}

// postSmiles POSTs {"smiles": smiles} to a chem-python endpoint and decodes
// the JSON response into out.
func (c *Client) postSmiles(path, smiles string, out any) error {
	body, err := json.Marshal(map[string]string{"smiles": smiles})
	if err != nil {
		return err
	}

	resp, err := c.http.Post(c.baseURL+path, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("calling chem-python: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnprocessableEntity {
		return &ErrInvalidSmiles{Smiles: smiles}
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("chem-python returned status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decoding chem-python response: %w", err)
	}
	return nil
}

type AnalyzeResult struct {
	CanonicalSmiles string  `json:"canonical_smiles"`
	InChIKey        string  `json:"inchikey"`
	MW              float64 `json:"mw"`
	LogP            float64 `json:"logp"`
	TPSA            float64 `json:"tpsa"`
	HDonors         int     `json:"h_donors"`
	HAcceptors      int     `json:"h_acceptors"`
	RingCount       int     `json:"ring_count"`
	Druglike        bool    `json:"druglike"`
}

func (c *Client) Analyze(smiles string) (*AnalyzeResult, error) {
	var result AnalyzeResult
	if err := c.postSmiles("/analyze", smiles, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

type DruglikePrediction struct {
	CanonicalSmiles   string  `json:"canonical_smiles"`
	PredictedDruglike bool    `json:"predicted_druglike"`
	Probability       float64 `json:"probability"`
	RuleBasedDruglike bool    `json:"rule_based_druglike"`
}

func (c *Client) PredictDruglike(smiles string) (*DruglikePrediction, error) {
	var result DruglikePrediction
	if err := c.postSmiles("/predict/druglike", smiles, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

type RenderResult struct {
	SVG string `json:"svg"`
}

func (c *Client) Render(smiles string) (*RenderResult, error) {
	var result RenderResult
	if err := c.postSmiles("/render", smiles, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// BatchRow mirrors chem-python's BatchRow — pointer fields since a failed
// row has none of the descriptors.
type BatchRow struct {
	Row             int      `json:"row"`
	OK              bool     `json:"ok"`
	Error           string   `json:"error,omitempty"`
	CanonicalSmiles string   `json:"canonical_smiles,omitempty"`
	InChIKey        string   `json:"inchikey,omitempty"`
	MW              *float64 `json:"mw,omitempty"`
	LogP            *float64 `json:"logp,omitempty"`
	TPSA            *float64 `json:"tpsa,omitempty"`
	HDonors         *int     `json:"h_donors,omitempty"`
	HAcceptors      *int     `json:"h_acceptors,omitempty"`
	RingCount       *int     `json:"ring_count,omitempty"`
	Druglike        *bool    `json:"druglike,omitempty"`
}

type BatchAnalyzeResult struct {
	Total int        `json:"total"`
	Rows  []BatchRow `json:"rows"`
}

// EmbedPoint mirrors chem-python's EmbedPoint — X/Y are nil for a row whose
// SMILES didn't parse.
type EmbedPoint struct {
	Row   int      `json:"row"`
	OK    bool     `json:"ok"`
	Error string   `json:"error,omitempty"`
	X     *float64 `json:"x,omitempty"`
	Y     *float64 `json:"y,omitempty"`
}

type EmbedResult struct {
	Points            []EmbedPoint `json:"points"`
	ExplainedVariance []float64    `json:"explained_variance"`
}

// postJSON POSTs a JSON-encoded body to a chem-python endpoint and decodes
// the response into out — the shared plumbing behind Embed/KMeans/SOM, which
// each send a different request shape but handle transport errors the same way.
func (c *Client) postJSON(path string, body any, out any) error {
	encoded, err := json.Marshal(body)
	if err != nil {
		return err
	}

	resp, err := c.http.Post(c.baseURL+path, "application/json", bytes.NewReader(encoded))
	if err != nil {
		return fmt.Errorf("calling chem-python: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("chem-python returned status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decoding chem-python response: %w", err)
	}
	return nil
}

// Embed calls chem-python's POST /embed to project each SMILES's Morgan
// fingerprint down to 2D via PCA, in the same order as the input.
func (c *Client) Embed(smiles []string) (*EmbedResult, error) {
	var result EmbedResult
	if err := c.postJSON("/embed", map[string][]string{"smiles": smiles}, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ClusterPoint mirrors chem-python's ClusterPoint — Cluster is nil for a row
// whose SMILES didn't parse.
type ClusterPoint struct {
	Row     int    `json:"row"`
	OK      bool   `json:"ok"`
	Error   string `json:"error,omitempty"`
	Cluster *int   `json:"cluster,omitempty"`
}

type KMeansResult struct {
	Points []ClusterPoint `json:"points"`
	K      int            `json:"k"`
}

// KMeans calls chem-python's POST /cluster/kmeans to partition every SMILES's
// Morgan fingerprint into k structurally-similar groups.
func (c *Client) KMeans(smiles []string, k int) (*KMeansResult, error) {
	var result KMeansResult
	body := map[string]any{"smiles": smiles, "k": k}
	if err := c.postJSON("/cluster/kmeans", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SomPoint mirrors chem-python's SomPoint — X/Y are the molecule's best
// matching unit on the grid, nil for a row whose SMILES didn't parse.
type SomPoint struct {
	Row   int    `json:"row"`
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
	X     *int   `json:"x,omitempty"`
	Y     *int   `json:"y,omitempty"`
}

type SomResult struct {
	Points   []SomPoint `json:"points"`
	GridSize int        `json:"grid_size"`
}

// SOM calls chem-python's POST /cluster/som to place every SMILES's Morgan
// fingerprint on a self-organizing map — a topology-preserving grid layout,
// unlike KMeans's flat cluster labels. gridSize <= 0 lets chem-python pick a
// size from the molecule count.
func (c *Client) SOM(smiles []string, gridSize int) (*SomResult, error) {
	var result SomResult
	body := map[string]any{"smiles": smiles}
	if gridSize > 0 {
		body["grid_size"] = gridSize
	}
	if err := c.postJSON("/cluster/som", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// BatchAnalyze uploads a file (SDF or CSV/SMILES-per-line) to chem-python's
// POST /batch/analyze for parsing + descriptor calculation — parsing only,
// no storage.
func (c *Client) BatchAnalyze(filename, format string, content []byte) (*BatchAnalyzeResult, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, fmt.Errorf("building multipart request: %w", err)
	}
	if _, err := part.Write(content); err != nil {
		return nil, fmt.Errorf("building multipart request: %w", err)
	}
	if err := writer.WriteField("format", format); err != nil {
		return nil, fmt.Errorf("building multipart request: %w", err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("building multipart request: %w", err)
	}

	resp, err := c.http.Post(c.baseURL+"/batch/analyze", writer.FormDataContentType(), &body)
	if err != nil {
		return nil, fmt.Errorf("calling chem-python: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("chem-python returned status %d", resp.StatusCode)
	}

	var result BatchAnalyzeResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding chem-python response: %w", err)
	}
	return &result, nil
}
