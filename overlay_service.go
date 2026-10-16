package main

import (
	"errors"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// OverlayService exposes window controls and the authoritative mechanic state.
// mu guards window flags and smoke-test observations, not StateStore internals.
type OverlayService struct {
	mu             sync.Mutex
	app            *application.App
	window         *application.WebviewWindow
	results        *application.WebviewWindow
	guide          *application.WebviewWindow
	store          *StateStore
	smoke          *smokeSession
	locked         bool
	resultsVisible bool
	canLock        bool
	warnings       []string
}

func newOverlayService(smokePath string) *OverlayService {
	testing := smokePath != ""
	service := &OverlayService{
		store:          newStateStore(testing),
		resultsVisible: !testing,
	}
	if testing {
		service.smoke = newSmokeSession(smokePath)
	}
	return service
}

type DesktopStatus struct {
	CanLock        bool     `json:"canLock"`
	Warnings       []string `json:"warnings"`
	ResultsVisible bool     `json:"resultsVisible"`
}

func (s *OverlayService) Status() DesktopStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	return DesktopStatus{
		CanLock:        s.canLock,
		Warnings:       append([]string{}, s.warnings...),
		ResultsVisible: s.resultsVisible,
	}
}

func (s *OverlayService) ToggleClickThrough() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.canLock {
		return errors.New("RECOVERY_HOTKEY_UNAVAILABLE")
	}
	s.locked = !s.locked
	s.results.SetIgnoreMouseEvents(s.locked)
	s.app.Event.Emit("overlay:lock", s.locked)
	return nil
}

func (s *OverlayService) GetSnapshot() Snapshot {
	return s.store.Snapshot()
}

func (s *OverlayService) SetField(key string, value any) (Snapshot, error) {
	snapshot, err := s.store.SetField(key, value)
	if err == nil {
		s.app.Event.Emit("overlay:state", snapshot)
	}
	return snapshot, err
}

func (s *OverlayService) SetStep(step int) Snapshot {
	snapshot := s.store.SetStep(step)
	s.app.Event.Emit("overlay:state", snapshot)
	return snapshot
}

func (s *OverlayService) Reset() Snapshot {
	snapshot := s.store.Reset()
	s.app.Event.Emit("overlay:state", snapshot)
	return snapshot
}

func (s *OverlayService) ShowResults() {
	s.mu.Lock()
	s.locked = false
	s.resultsVisible = true
	s.mu.Unlock()
	s.results.SetIgnoreMouseEvents(false)
	s.app.Event.Emit("overlay:lock", false)
	s.results.Show()
	s.results.Focus()
	s.app.Event.Emit("overlay:visibility", true)
}

func (s *OverlayService) HideResults() {
	s.mu.Lock()
	s.resultsVisible = false
	s.mu.Unlock()
	s.results.Hide()
	s.app.Event.Emit("overlay:visibility", false)
}

func (s *OverlayService) ToggleResults() bool {
	s.mu.Lock()
	visible := s.resultsVisible
	s.mu.Unlock()
	if visible {
		s.HideResults()
	} else {
		s.ShowResults()
	}
	return !visible
}

func (s *OverlayService) Quit() {
	s.app.Quit()
}
