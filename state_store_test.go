package main

import "testing"

func TestSnapshotIsolationAndIndependentEdits(t *testing.T) {
	s := newStateStore(false)
	a, err := s.SetField("cross1", true)
	if err != nil {
		t.Fatal(err)
	}
	a.Values["cross1"] = false
	b, err := s.SetField("bombSource", float64(1))
	if err != nil {
		t.Fatal(err)
	}
	if b.Values["cross1"] != true || b.Values["bombSource"] != float64(1) || b.Revision != 2 {
		t.Fatalf("lost edit or mutable snapshot: %+v", b)
	}
	if _, err = s.SetField("not-a-field", true); err == nil {
		t.Fatal("accepted unknown key")
	}
	if _, err = s.SetField("duration1", "invalid"); err == nil {
		t.Fatal("accepted invalid duration")
	}
	if s.Snapshot().Revision != 2 {
		t.Fatal("invalid edits changed revision")
	}
}
func TestStepAndResetSharedBetweenWindows(t *testing.T) {
	s := newStateStore(false)
	s.SetField("cross2", false)
	if s.SetStep(99).Step != 4 || s.SetStep(-1).Step != 0 {
		t.Fatal("invalid step bounds")
	}
	before := s.Snapshot()
	after := s.Reset()
	if after.Step != 0 || after.Revision <= before.Revision || len(after.Values) != 13 {
		t.Fatalf("bad reset: %+v", after)
	}
	for _, value := range after.Values {
		if value != nil {
			t.Fatal("reset kept a mechanic")
		}
	}
}
