# 妖星 P4 记忆浮窗

使用 Wails v3 和 Go 开发的 Windows 桌面工具。原生透明无边框窗口，默认置顶；前端使用 Vue 3 + Vite，构建产物嵌入 EXE；运行时不需要 Node.js。

## 界面演示

默认紫色主题下的独立处理结果窗口：

![处理结果窗口演示](docs/images/overlay-demo.jpg)

## 下载与运行

1. 打开本仓库的 **Releases**，选择需要的版本。
2. 在 **Assets** 中下载 `P4Overlay-windows-x64.zip`，解压到独立文件夹。`Source code (zip/tar.gz)` 是源码，需要自行编译。
3. 双击解压后的 `P4Overlay.exe`，会同时打开机制录入和处理结果两个窗口。

适用于 Windows x64，需要 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。下载成品运行无需安装 Go、Node.js 或 Wails CLI。压缩包包含 EXE、`locales` 翻译目录和使用说明；更新时保留自己修改过的翻译文件。

尚未发布正式版本时，可打开 **Actions → Windows build and release → 成功的运行 → Artifacts**，下载 `P4Overlay-windows-x64`。Artifacts 需要登录 GitHub，保留14天；解压后再解开其中的应用压缩包。

## 名词解释

| 界面提示 | 含义 |
| --- | --- |
| 炸弹禁止 | 真加速度炸弹：判定时保持静止，停止移动、跳跃及其他动作。 |
| 炸弹移动 | 假加速度炸弹：判定时需要移动或跳跃。 |
| 石化出 | 真石化：携带「诅咒之嚎」的玩家离开人群，到指定位置处理；其他玩家背对石化眼。 |
| 石化进 | 假石化：携带「诅咒之嚎」的玩家进入人群的指定位置处理；其他玩家面向石化眼。 |
| 雷出去／水出去 | 对应雷／水 Buff 的玩家离开分摊人群，按队伍约定的位置分散。 |

“石化出／进”描述的是石化 Buff 玩家的站位，不是让全队一起进出。“炸弹禁止／移动”提示用于炸弹判定时刻，不代表整轮都要保持该动作；按照本攻略，两轮水雷判定时均执行自己的炸弹动作。

## 本地下载源码与编译

仅在开发或需要自行编译时执行。先从仓库的 **Code → Download ZIP** 下载并解压源码，或使用 Git 克隆仓库，然后在项目根目录打开 PowerShell。

安装 Go 1.26 和 Node.js 24（包含 npm），可从 [Go 官网](https://go.dev/dl/) 和 [Node.js 官网](https://nodejs.org/en/download) 获取。本项目固定使用 Wails `v3.0.0-beta.29`、Vue 3.5.44、Vite 8.3.4；无需安装 Wails CLI。

```powershell
# 安装锁定版本的前端依赖
npm ci --prefix frontend
# 构建前端、执行测试、生成 Windows EXE
.\build.ps1 -Test
# 打包完整便携版
.\tools\package-release.ps1
# 启动
.\bin\P4Overlay.exe
```

编译需要网络下载 Go 模块和 npm 依赖。`build.ps1` 会自动配置项目内的 Go/npm 缓存，并在前端依赖尚未安装时执行 npm ci；Vite 产物内嵌 EXE，运行不依赖开发服务器。Windows 图标资源使用固定版本 `github.com/akavel/rsrc@v0.10.2` 生成。

## 致谢

感谢 **MMW 攻略组** 整理并分享[《妖星乱舞绝境战》攻略](https://mmw-ffxiv.feishu.cn/wiki/QcTowwlWxihWg9kNE3hcy6Qnnvg)，为本工具的机制整理与流程图展示提供参考。
