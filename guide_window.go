package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Create the reference viewer on demand and retain its current page on close.
func (s *OverlayService) ShowGuide() {
	s.mu.Lock()
	if s.guide == nil {
		s.guide = s.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Name: "p4-guide", Title: localeText("guide.title"), URL: "/guide.html",
			Width: 1000, Height: 980, MinWidth: 640, MinHeight: 500,
			AlwaysOnTop: true, DefaultContextMenuDisabled: true,
		})
		s.guide.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			s.guide.Hide()
			event.Cancel()
		})
	}
	window := s.guide
	s.mu.Unlock()
	window.Show()
	window.Focus()
}
