import { contextBridge, ipcRenderer } from 'electron'

/**
 * 通过 contextBridge 安全地将文件系统 API 暴露给 renderer。
 * renderer 只能通过 window.api 调用，不直接接触 Node.js。
 */
contextBridge.exposeInMainWorld('api', {
  // ───────── 对话框 ─────────
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openProject: () => ipcRenderer.invoke('dialog:openProject'),
  saveFileDialog: (filters: Electron.FileFilter[], defaultName?: string) =>
    ipcRenderer.invoke('dialog:saveFile', filters, defaultName),
  selectExportFolder: () => ipcRenderer.invoke('dialog:selectExportFolder'),

  // ───────── 项目管理 ─────────
  createProject: (projectDir: string, projectName: string) =>
    ipcRenderer.invoke('project:create', projectDir, projectName),
  saveProject: (projectDir: string, manifest: unknown) =>
    ipcRenderer.invoke('project:save', projectDir, manifest),
  loadProject: (projectDir: string) =>
    ipcRenderer.invoke('project:load', projectDir),
  copyImage: (projectDir: string, sourcePath: string, itemIndex: number) =>
    ipcRenderer.invoke('project:copyImage', projectDir, sourcePath, itemIndex),
  checkImageExists: (projectDir: string, relativePath: string) =>
    ipcRenderer.invoke('project:checkImageExists', projectDir, relativePath),
  getImagePath: (projectDir: string, relativePath: string) =>
    ipcRenderer.invoke('project:getImagePath', projectDir, relativePath),
  revealInExplorer: (projectDir: string, relativePath: string) =>
    ipcRenderer.invoke('project:revealInExplorer', projectDir, relativePath),
  getAbsoluteImagePath: (projectDir: string, relativePath: string) =>
    ipcRenderer.invoke('project:getAbsoluteImagePath', projectDir, relativePath),
  // 原生拖出到 Windows 资源管理器（sendSync 确保在 dragstart 事件内同步执行）
  startDragFile: (filePaths: string | string[]) =>
    ipcRenderer.sendSync('shell:startDrag', filePaths),
  // 将文件列表写入系统剪贴板（CF_HDROP），可在资源管理器粘贴
  copyFilesToClipboard: (filePaths: string[]) =>
    ipcRenderer.invoke('clipboard:copyFiles', filePaths),

  // ───────── 最近项目 ─────────
  listRecentProjects: () => ipcRenderer.invoke('recent:list'),
  addRecentProject: (projectDir: string, projectName: string) =>
    ipcRenderer.invoke('recent:add', projectDir, projectName),
  removeRecentProject: (projectDir: string) =>
    ipcRenderer.invoke('recent:remove', projectDir),

  // ───────── 文件系统 ─────────
  writeTextFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeTextFile', filePath, content),
  readFileAsBase64: (filePath: string) =>
    ipcRenderer.invoke('fs:readFileAsBase64', filePath),

  // ───────── 导出 ─────────
  exportImages: (opts: unknown) =>
    ipcRenderer.invoke('export:images', opts),
  exportCopyFile: (sourcePath: string, destPath: string) =>
    ipcRenderer.invoke('export:copyFile', sourcePath, destPath)
})
