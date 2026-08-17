package chempy

import (
	"bytes"
	"encoding/json"
	"fmt"
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
		http:    &http.Client{Timeout: 10 * time.Second},
	}
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

// ErrInvalidSmiles is returned when chem-python rejects the input SMILES.
type ErrInvalidSmiles struct{ Smiles string }

func (e *ErrInvalidSmiles) Error() string {
	return fmt.Sprintf("invalid SMILES: %q", e.Smiles)
}

func (c *Client) Analyze(smiles string) (*AnalyzeResult, error) {
	body, err := json.Marshal(map[string]string{"smiles": smiles})
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Post(c.baseURL+"/analyze", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("calling chem-python: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnprocessableEntity {
		return nil, &ErrInvalidSmiles{Smiles: smiles}
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("chem-python returned status %d", resp.StatusCode)
	}

	var result AnalyzeResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding chem-python response: %w", err)
	}
	return &result, nil
}
