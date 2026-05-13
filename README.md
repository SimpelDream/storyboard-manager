# 分镜管理器 · Storyboard Manager

> 本地优先的图文分镜管理桌面工具，专为 AI 生图工作流设计。

---

## 项目简介

在 AI 生图工作流中，你通常需要：

1. 把一段故事切成若干片段
2. 为每个片段写好分镜提示词
3. 把生成的图片与对应行一一对齐

这件事用 Excel / Notion / 文件夹手动管理极其繁琐。**分镜管理器**就是为此而生的——一个轻量、纯本地、零网络依赖的桌面小工具，让你把故事、提示词、图片三列并排管理，所见即所得。

---

## 功能特性

### 核心工作流
- **故事导入**：粘贴全文，按自定义分隔符一键拆分为多行
- **提示词导入**：同样支持批量导入、自动对齐行号
- **图片拖入**：直接把图片文件拖到对应行的图片槽，自动复制并绑定
- **三列并排**：故事片段 · 分镜提示词 · 图片，横向对比一目了然

### 视图与编辑
- 列宽可拖动调整，设置自动持久化
- 三列可独立显示/隐藏（仅看图片、仅看文本等场景）
- 字号可调（10–24 px），文本框随内容自动伸缩高度
- 行状态标签：未配图 / 可用 / 需重绘 / 已锁定
- 备注字段（可折叠）

### 图片管理
- 缩略图支持多种尺寸与裁切模式（contain / cover）
- 行内点击即可全屏预览，按 **ESC** 或点击背景关闭
- 图片槽之间支持拖拽移动 / 交换 / 复制
- 多选图片：
  - 单张 → 复制像素内容到剪贴板（可粘贴到 PS / 聊天窗口）
  - 多张 → 写入 **CF_HDROP** 系统文件剪贴板（可在资源管理器粘贴为文件）

### 数据管理
- 所有数据保存在本地 `project.json`，图片统一存放在项目目录
- 自动保存（防抖 1s），Ctrl+S 手动触发
- 支持多项目管理，首页展示最近打开记录
- 删除行时内容自动合并至上一行（文本追加，图片保留）

### 导出
- 导出故事文本 / 提示词文本（支持带编号标题或纯内容）
- 批量导出图片（重命名为序号，支持带/不带原始文件名）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Electron](https://www.electronjs.org/) 31 |
| 构建工具 | [electron-vite](https://electron-vite.org/) + [Vite](https://vitejs.dev/) 5 |
| 前端 | React 18 + TypeScript |
| 打包 | electron-builder |
| 数据存储 | 本地 JSON 文件 + 文件系统 |

无数据库，无云端，无登录，无网络请求。

---

## 快速开始

### 直接使用（推荐）

从 [Releases](../../releases) 页面下载最新的 `dist-win-unpacked.zip`，解压后运行 `分镜管理器.exe`，无需安装。

> 需要 Windows 10 x64 及以上系统。

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/<your-username>/storyboard-manager.git
cd storyboard-manager

# 安装依赖
npm install

# 启动开发模式（热更新）
npm run dev

# 构建
npm run build

# 打包为可执行文件
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npx electron-builder --win --x64
```

> 打包前请确认已在 Windows 设置中开启**开发者模式**，否则 electron-builder 解压时可能因符号链接权限报错。

---

## 项目结构

```
storyboard-manager/
├── src/
│   ├── main/          # Electron 主进程（文件系统、IPC、剪贴板）
│   ├── preload/       # contextBridge 安全桥接层
│   └── renderer/      # React 前端
│       ├── components/  # UI 组件
│       ├── store/       # 状态管理（projectStore）
│       ├── types/       # 共享类型定义
│       └── utils/
├── out/               # electron-vite 构建产物
├── dist/              # electron-builder 打包产物
└── package.json
```

---

## 使用说明

1. 启动后点击「新建项目」，选择一个空文件夹作为项目目录
2. 点击「导入故事」，粘贴故事全文，选择分隔符，一键拆分
3. 点击「导入提示词」，同样方式导入分镜提示词
4. 将已生成的图片从文件夹拖入对应行的图片槽
5. 使用顶部工具栏调整视图、导出内容

---

## License

MIT

---

> 本项目不包含任何 AI 生图接口，不联网，不收集任何数据。所有内容仅保存在你自己的电脑上。
