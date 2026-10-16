# 开发说明

界面使用 Vue 3 单文件组件，Vite 负责多页面构建；Go / Wails 负责透明窗口、快捷键和共享状态。EXE 内嵌构建产物，运行时不依赖 Node.js 或开发服务器。

## 从哪里开始读

1. `main.go`：创建服务，注册窗口和快捷键，启动 Wails。
2. `frontend/src/App.vue`：录入窗和结果窗共用入口，通过 `?view=results` 区分布局。
3. `frontend/src/composables/useOverlay.js`：响应式状态、录入操作和连接生命周期。窗口动作在 `useWindowControls.js`，状态栏文案在 `useOverlayStatus.js`，页面入口只负责组装。
4. `frontend/src/components/`：`InputsPanel` 按读条顺序组织录入，`InputGroup` 根据配置渲染按钮，`ResultsPanel` 渲染处理轮次，`AppearancePanel` 和 `ColourField` 管理设置表单。
5. `frontend/rules.js`：从录入值推导动作和真假，不依赖 Vue、DOM 或存储。
6. `frontend/src/GuideApp.vue`：独立流程图入口，管理页码、缩放、键盘与图片就绪通知。

## 一次点击如何更新两个窗口

输入组件通过 `select` 事件上报字段和值。`useOverlay` 先更新当前响应式快照，再调用 `connection.publish()` 提交 Go。结果组件通过计算属性更新，带稳定 key 的轮次按钮避免普通更新导致焦点丢失。

`connection.js` 中的 `SnapshotSync` 按点击顺序排队写入。写入未完成时缓存最新快照，最后一次写入结束后，从缓存事件和请求响应中选择版本最高的快照。版本号比已应用版本旧的快照会被忽略，防止旧响应覆盖新选择。

写入失败时主动回读 Go 状态，恢复实际保存的值，再显示原始错误；回读也失败时保留原始错误，后续写入仍能继续。首次快照和窗口状态都读取完成后才开放桌面录入。

`OverlayService` 调用 `StateStore` 校验并保存修改，随后广播 `overlay:state`。两窗使用同一权威快照和同一规则函数推导结果。浏览器预览改用 `BroadcastChannel` 同步；Wails runtime 保留为运行时动态导入，不打包进 Vite 产物。

`useOverlay` 在挂载时连接，在作用域销毁时释放事件与预览通道。原生自检收到 Vue 的 `nextTick()` 后，由 `src/diagnostics.js` 统一读取实际 DOM，避免验证到尚未渲染的状态，也避免让普通状态操作依赖页面选择器。重复选择当前轮、在首尾继续切换时不提交无效更新。

## 需要保留的机制约定

- `null` 表示未录入，不能当作假。
- 大十字水雷按时长映射到第一、第三轮；石化按大十字1、2固定对应。
- 炸弹动作继承个人被哪次大十字点名，不跟随水雷长短变化。水雷和炸弹同一行，石化另列下一步。
- 卡奥斯首次读条可能是火或水；结算顺序始终火先、水后。`linkedMechanics()` 映射读条来源，`rounds()` 固定结果顺序。
- 可选模块关闭时，不能读取对应字段推导结果；隐藏字段不计入进度。
- 翻译键名和偏好存储键保留兼容，避免覆盖 EXE 旁的用户翻译或已有配色。

## 外观与窗口状态

`usePreferences` 负责语言、配色、模块开关和跨窗存储事件；`useOpacity` 保持每窗独立的透明度键。`preferences.js` 集中声明默认值、颜色字段、字号与透明度范围，并处理格式校验和读取；设置表单与校验共用配置，避免多处修改。根组件提供响应式语言，子组件经 `useTranslation` 获取，切换语言会刷新整个组件树。设置错误通过同一状态栏展示。

翻译从绝对路径 `/locales/语言.json` 加载，由 Go 合并外部文件与内置默认值。流程图片从 `/guide/step-01.png` 等路径加载。准备脚本复制静态资源到生成目录 `frontend/public`，Vite 再复制到 `frontend/dist`；不要直接编辑这两个目录。

`overlay_service.go` 管理桌面窗口操作。结果窗和流程图关闭时隐藏，关闭录入窗退出。`smoke.go` 的自检会话只在 `--smoke-test` 时创建，与正常窗口状态分离。

## 样式职责

- `style.css`：基础控件与窗口布局。
- `encounters.css`：紧凑录入、轮次结果和文字放大后的换行布局。
- `theme.css`：主题颜色、语言适配与外观设置表单。
- `guide.css`：独立流程图窗口。

字体使用 rem，根字号由共享的字体倍率驱动。修改样式时优先在负责该区域的文件中修改，避免在主题文件末尾叠加布局补丁。

## 开发与验证

```powershell
npm ci --prefix frontend
npm run dev --prefix frontend
# 生产构建、全部前端测试、Go 测试与 vet、EXE
.\build.ps1 -Test -Output release/P4Overlay.exe
```

`package-lock.json` 固定依赖版本。构建脚本在缺少前端依赖时自动执行 npm ci，随后构建两个 HTML 入口。已有依赖版本需要刷新时手动执行 npm ci。前端测试通过 `frontend/*.test.js` 自动发现；Vue 单文件组件由生产构建校验。

规则测试覆盖真假、长短水雷换序、炸弹来源、卡奥斯先后读条、未录入和可选模块。连接测试覆盖旧版本快照、连续写入和失败后继续写入。

原生自检需要预先存在的输出目录和独立报告路径：

```powershell
New-Item -ItemType Directory -Force qa | Out-Null
.\release\P4Overlay.exe --smoke-test (Join-Path $PWD 'qa\check.json')
```

检查报告中的 `renderer: vue3`、双窗结果一致、显隐与数据保留、穿透恢复，以及流程原图加载和重新打开。自检完成后自动退出。发布前还需用浏览器验证录入、取消、模块开关、语言配色及流程图交互；游戏内透明和鼠标穿透仍需实际环境确认。

GitHub 发布通过 `.github/workflows/windows.yml` 完成：分支和 PR 构建检查并保存 Artifact，`v*` 标签在检查通过后发布 Release。打包统一使用 `tools/package-release.ps1`，生成 `dist/P4Overlay-windows-x64.zip`。本地发布时保留旧 EXE，不要覆盖用户定制的 `bin/locales`；无需提交本地二进制。
