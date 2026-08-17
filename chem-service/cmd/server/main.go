package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"molhub/chem-service/internal/chempy"
	"molhub/chem-service/internal/db"
	"molhub/chem-service/internal/handlers"
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	ctx := context.Background()

	dbURL := getenv("DATABASE_URL", "postgres://molhub:molhub@localhost:5432/molhub")
	chemPyURL := getenv("CHEM_PYTHON_URL", "http://localhost:8000")
	addr := getenv("ADDR", ":8080")

	pool, err := db.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer pool.Close()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "database unreachable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte(`{"status":"ok"}`))
	})

	mols := &handlers.Molecules{
		Pool:   pool,
		ChemPy: chempy.NewClient(chemPyURL),
	}
	mux.HandleFunc("POST /molecules", mols.Create)
	mux.HandleFunc("GET /molecules", mols.List)
	mux.HandleFunc("GET /molecules/{id}", mols.Get)

	log.Printf("chem-service listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
