package main

import (
	"flag"
	"log"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	smoke := flag.String("smoke-test", "", "write a native/bridge report and exit without showing the window")
	flag.Parse()
	smokePath := *smoke
	if smokePath != "" {
		absolute, err := filepath.Abs(smokePath)
		if err != nil {
			log.Fatal(err)
		}
		smokePath = absolute
	}
	service := newOverlayService(smokePath)
	options := application.Options{
		Name:        localeText("app.name"),
		Icon:        appIcon,
		Description: localeText("app.description"),
		Services:    []application.Service{application.NewService(service)},
		Assets:      application.AssetOptions{Handler: frontendHandler(*smoke != "")},
	}
	if smokePath != "" {
		options.Windows.WebviewUserDataPath = filepath.Join(filepath.Dir(smokePath), "webview-profile")
	}
	app := application.New(options)
	service.app = app
	createWindows(app, service, *smoke != "")
	registerShortcuts(app, service)
	service.startSmokeTimeout()
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
