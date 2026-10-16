package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"syscall"
)

var getWindowLong = syscall.NewLazyDLL("user32.dll").NewProc("GetWindowLongW")
var getWindowIcon = syscall.NewLazyDLL("user32.dll").NewProc("SendMessageW")
var isWindowVisible = syscall.NewLazyDLL("user32.dll").NewProc("IsWindowVisible")

func nativeWindowState(window *application.WebviewWindow) map[string]any {
	var style uintptr
	var icon uintptr
	var visible uintptr
	application.InvokeSync(func() {
		index := int32(-20) // GWL_EXSTYLE
		style, _, _ = getWindowLong.Call(uintptr(window.NativeWindow()), uintptr(index))
		icon, _, _ = getWindowIcon.Call(uintptr(window.NativeWindow()), 0x007f, 1, 0)
		visible, _, _ = isWindowVisible.Call(uintptr(window.NativeWindow()))
	})
	return map[string]any{
		"visible":             visible != 0,
		"hasHandle":           window.NativeWindow() != nil,
		"hasIcon":             icon != 0,
		"topmost":             style&0x8 != 0,
		"transparentHitTest":  style&0x20 != 0,
		"noRedirectionBitmap": style&0x200000 != 0,
	}
}
