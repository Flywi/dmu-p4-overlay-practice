package main

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"time"
)

// Only allocated for --smoke-test; ordinary window state stays in OverlayService.
type smokeSession struct {
	outputPath string
	frontends  map[string]map[string]any
	notes      map[string]string
	truth      map[string]string
	guideReady chan map[string]any
	done       bool
}

func newSmokeSession(outputPath string) *smokeSession {
	return &smokeSession{
		outputPath: outputPath,
		frontends:  make(map[string]map[string]any),
		notes:      make(map[string]string),
		truth:      make(map[string]string),
		guideReady: make(chan map[string]any, 1),
	}
}

func (s *OverlayService) startSmokeTimeout() {
	if s.smoke == nil {
		return
	}
	go func() {
		time.Sleep(30 * time.Second)
		if _, err := os.Stat(s.smoke.outputPath); errors.Is(err, os.ErrNotExist) {
			_ = os.WriteFile(s.smoke.outputPath, []byte(`{"error":"WebView2/bridge did not become ready within 30s"}`), 0600)
			s.app.Quit()
		}
	}()
}

// Ready verifies the real WebView2 bridge during the opt-in hidden smoke test.
func (s *OverlayService) Ready(frontend map[string]any) error {
	if s.smoke == nil {
		return nil
	}
	view, _ := frontend["view"].(string)
	s.mu.Lock()
	s.smoke.frontends[view] = frontend
	allReady := len(s.smoke.frontends) == 2
	s.mu.Unlock()
	if !allReady {
		return nil
	}
	// Verify a backend update actually reaches both real WebView2 windows.
	s.store.SetField("cross1", true)
	s.store.SetField("duration1", "short")
	snapshot, _ := s.store.SetField("bombSource", 1)
	s.app.Event.Emit("overlay:state", snapshot)
	return nil
}

func (s *OverlayService) Acknowledge(view string, revision uint64, firstRoundNote string, firstRoundTruth string) error {
	if s.smoke == nil || revision != 3 {
		return nil
	}
	s.mu.Lock()
	if s.smoke.done {
		s.mu.Unlock()
		return nil
	}
	s.smoke.notes[view] = firstRoundNote
	s.smoke.truth[view] = firstRoundTruth
	allObserved := len(s.smoke.notes) == 2
	if allObserved {
		s.smoke.done = true
	}
	s.mu.Unlock()
	if !allObserved {
		return nil
	}
	// Let initial hidden-window creation finish before exercising visibility.
	go func() {
		time.Sleep(500 * time.Millisecond)
		if err := s.finishSmoke(revision); err != nil {
			log.Print(err)
		}
	}()
	return nil
}

func (s *OverlayService) finishSmoke(revision uint64) error {
	checks := map[string]any{"frontend": s.smoke.frontends, "observed": s.smoke.notes, "shortcuts": s.Status()}
	checks["observedTruth"] = s.smoke.truth
	checks["editorNative"] = nativeWindowState(s.window)
	checks["native"] = nativeWindowState(s.results)
	if err := s.ToggleClickThrough(); err != nil {
		checks["lockError"] = err.Error()
	}
	checks["locked"] = s.results.IsIgnoreMouseEvents()
	checks["lockedNative"] = nativeWindowState(s.results)
	checks["editorStillInteractive"] = !s.window.IsIgnoreMouseEvents()
	_ = s.ToggleClickThrough()
	checks["unlocked"] = !s.results.IsIgnoreMouseEvents()
	// Windows applies Start-Process -WindowStyle Hidden to the first ShowWindow
	// call. Consume that launch setting before checking the normal toggle path.
	s.ShowResults()
	s.HideResults()
	s.ToggleResults()
	time.Sleep(150 * time.Millisecond)
	checks["resultsOpened"] = s.results.IsVisible()
	checks["openedNative"] = nativeWindowState(s.results)
	s.ToggleResults()
	time.Sleep(150 * time.Millisecond)
	checks["resultsClosed"] = !s.results.IsVisible()
	checks["statePreservedAfterHide"] = s.store.Snapshot().Revision == revision
	s.ShowGuide()
	select {
	case details := <-s.smoke.guideReady:
		checks["guide"] = details
		checks["guideNative"] = nativeWindowState(s.guide)
		s.guide.Hide()
		s.ShowGuide()
		checks["guideReopened"] = s.guide.IsVisible()
		s.guide.Hide()
	case <-time.After(10 * time.Second):
		checks["guideError"] = "Guide image/bridge did not load within 10s"
	}
	data, err := json.MarshalIndent(checks, "", "  ")
	if err == nil {
		err = os.WriteFile(s.smoke.outputPath, data, 0600)
	}
	go func() { time.Sleep(250 * time.Millisecond); s.app.Quit() }()
	return err
}

// Used only by the opt-in native smoke test after the first original has loaded.
func (s *OverlayService) GuideReady(details map[string]any) {
	if s.smoke == nil {
		return
	}
	select {
	case s.smoke.guideReady <- details:
	default:
	}
}
