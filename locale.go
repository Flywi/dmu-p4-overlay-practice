package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
)

// Sidecar files override embedded defaults so translators need not rebuild the EXE.
func localeBytes(language string) ([]byte, error) {
	data, err := assets.ReadFile("frontend/locales/" + language + ".json")
	if err != nil {
		return nil, err
	}
	var defaults map[string]string
	if err = json.Unmarshal(data, &defaults); err != nil {
		return nil, err
	}
	if executable, err := os.Executable(); err == nil {
		if override, err := os.ReadFile(filepath.Join(filepath.Dir(executable), "locales", language+".json")); err == nil {
			var translations map[string]string
			if json.Unmarshal(bytes.TrimPrefix(override, []byte{0xef, 0xbb, 0xbf}), &translations) == nil {
				for key, value := range translations {
					defaults[key] = value
				}
			}
		}
	}
	return json.Marshal(defaults)
}
func localeText(key string) string {
	data, err := localeBytes("zh-CN")
	if err != nil {
		return key
	}
	var dictionary map[string]string
	if json.Unmarshal(data, &dictionary) != nil {
		return key
	}
	if value, ok := dictionary[key]; ok {
		return value
	}
	return key
}
func nativeTitle(view string) string {
	return localeText("app.name") + " · " + localeText("window."+view)
}
