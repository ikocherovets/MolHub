package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	return pgxpool.New(ctx, connString)
}

type Molecule struct {
	ID         int64   `json:"id"`
	Smiles     string  `json:"smiles"`
	InChIKey   string  `json:"inchikey"`
	MW         float64 `json:"mw"`
	LogP       float64 `json:"logp"`
	TPSA       float64 `json:"tpsa"`
	HDonors    int     `json:"h_donors"`
	HAcceptors int     `json:"h_acceptors"`
	RingCount  int     `json:"ring_count"`
	Druglike   bool    `json:"druglike"`
}
