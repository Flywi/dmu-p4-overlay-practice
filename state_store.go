package main

import (
	"fmt"
	"sync"
)

var mechanicFields = []string{"cross1", "cross2", "duration1", "bombSource", "element1", "chaos1", "chaos2", "flood", "fate", "thunder", "ice", "releaseThunder", "releaseIce"}

type Snapshot struct {
	Values   map[string]any `json:"values"`
	Step     int            `json:"step"`
	Revision uint64         `json:"revision"`
	Testing  bool           `json:"testing"`
}

type StateStore struct {
	mu       sync.Mutex
	values   map[string]any
	step     int
	revision uint64
	testing  bool
}

func newStateStore(testing bool) *StateStore {
	s := &StateStore{testing: testing}
	s.clear()
	return s
}

func (s *StateStore) clear() {
	s.values = make(map[string]any, len(mechanicFields))
	for _, key := range mechanicFields {
		s.values[key] = nil
	}
}

func (s *StateStore) snapshotLocked() Snapshot {
	values := make(map[string]any, len(s.values))
	for key, value := range s.values {
		values[key] = value
	}
	return Snapshot{
		Values:   values,
		Step:     s.step,
		Revision: s.revision,
		Testing:  s.testing,
	}
}

func (s *StateStore) Snapshot() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshotLocked()
}

func (s *StateStore) SetField(key string, value any) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.values[key]; !ok {
		return Snapshot{}, fmt.Errorf("unknown mechanic field: %s", key)
	}
	valid := value == nil
	if !valid {
		switch key {
		case "duration1":
			valid = value == "short" || value == "long"
		case "element1":
			valid = value == "fire" || value == "water"
		case "fate":
			valid = value == "death" || value == "domain"
		case "bombSource":
			valid = value == float64(1) || value == float64(2) || value == 1 || value == 2
		default:
			_, valid = value.(bool)
		}
	}
	if !valid {
		return Snapshot{}, fmt.Errorf("invalid value for %s", key)
	}
	s.values[key] = value
	s.revision++
	return s.snapshotLocked(), nil
}

func (s *StateStore) SetStep(step int) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	if step < 0 {
		step = 0
	}
	if step > 4 {
		step = 4
	}
	s.step = step
	s.revision++
	return s.snapshotLocked()
}

func (s *StateStore) Reset() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.clear()
	s.step = 0
	s.revision++
	return s.snapshotLocked()
}
