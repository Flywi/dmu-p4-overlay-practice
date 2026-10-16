package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed frontend/dist frontend/locales/*.json
var assets embed.FS

//go:embed assets/app.png
var appIcon []byte

// Serve editable locale sidecars before falling back to embedded UI assets.
func frontendHandler(diagnostic bool) http.Handler {
	frontend, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatal(err)
	}
	assetHandler := application.AssetFileServerFS(frontend)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if diagnostic {
			log.Printf("asset: %s", r.URL.String())
		}
		if r.URL.Path == "/__diagnostic" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.URL.Path == "/locales/zh-CN.json" || r.URL.Path == "/locales/en-US.json" {
			language := r.URL.Path[len("/locales/") : len(r.URL.Path)-len(".json")]
			data, err := localeBytes(language)
			if err != nil {
				http.Error(w, "Unable to load translations", 500)
				return
			}
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			_, _ = w.Write(data)
			return
		}
		assetHandler.ServeHTTP(w, r)
	})
}
