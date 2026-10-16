package main

import (
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Both windows share transparency, icon behavior and platform settings.
func overlayWindowOptions(view string, hidden bool) application.WebviewWindowOptions {
	options := application.WebviewWindowOptions{
		Name:                       "p4-" + view,
		Title:                      nativeTitle(view),
		URL:                        "/",
		Width:                      470,
		Height:                     650,
		MinWidth:                   400,
		MinHeight:                  440,
		InitialPosition:            application.WindowXY,
		X:                          40,
		Y:                          80,
		Frameless:                  true,
		AlwaysOnTop:                true,
		Hidden:                     hidden,
		BackgroundType:             application.BackgroundTypeTransparent,
		BackgroundColour:           application.NewRGBA(0, 0, 0, 0),
		DefaultContextMenuDisabled: true,
		Windows: application.WindowsWindow{
			WebView2CompositionHosting:        true,
			DisableFramelessWindowDecorations: true,
		},
	}
	if view == "results" {
		options.URL = "/?view=results"
		options.Width, options.Height = 440, 460
		options.MinWidth, options.MinHeight = 340, 350
		options.X = 530
	}
	return options
}

func createWindows(app *application.App, service *OverlayService, hidden bool) {
	service.window = app.Window.NewWithOptions(overlayWindowOptions("editor", hidden))
	service.results = app.Window.NewWithOptions(overlayWindowOptions("results", hidden))
	service.results.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		service.HideResults()
		event.Cancel()
	})
	service.window.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		app.Quit()
	})
}

func registerShortcuts(app *application.App, service *OverlayService) {
	lockErr := app.GlobalShortcut.Register("Ctrl+Alt+F8", func() {
		if err := service.ToggleClickThrough(); err != nil {
			log.Print(err)
		}
	})
	service.canLock = lockErr == nil
	var warnings []string
	if lockErr != nil {
		warnings = append(warnings, "F8")
	}
	if err := app.GlobalShortcut.Register("Ctrl+Alt+F9", func() {
		service.ToggleResults()
	}); err != nil {
		warnings = append(warnings, "F9")
	}
	for _, key := range []struct {
		accelerator string
		direction   int
	}{
		{"Ctrl+Alt+F10", 1}, {"Ctrl+Alt+F7", -1},
	} {
		direction := key.direction
		if err := app.GlobalShortcut.Register(key.accelerator, func() { app.Event.Emit("overlay:advance", direction) }); err != nil {
			warnings = append(warnings, key.accelerator)
		}
	}
	service.warnings = warnings
}
