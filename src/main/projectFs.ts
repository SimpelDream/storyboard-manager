import { ipcMain, dialog, shell, BrowserWindow, nativeImage, clipboard } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

/** 项目清单的数据结构（与 renderer 共享 types/project.ts 保持一致） */
interface ProjectManifest {
  version: string
  projectId: string
  projectName: string
  createdAt: string
  updatedAt: string
  splitSymbol: string
  viewSettings: {
    thumbnailAspectRatio: '16:9' | '9:16' | 'original'
    thumbnailSize: 'small' | 'medium' | 'large' | 'custom'
    customThumbnailWidth?: number
    imageFit: 'contain' | 'cover'
  }
  exportSettings: {
    textExportMode: 'content_only' | 'with_index_title'
    promptExportMode: 'content_only' | 'with_index_title'
    exportSeparator: string
    imageExportNameMode: 'simple_index' | 'index_with_original_name'
  }
  items: StoryItem[]
}

interface StoryItem {
  id: string
  index: number
  text: string
  prompt: string
  imagePath?: string
  imageFileName?: string
  status: 'missing' | 'usable' | 'needs_regen' | 'locked'
  note?: string
}

/** 默认项目清单工厂函数 */
function createDefaultManifest(projectName: string): ProjectManifest {
  return {
    version: '1.0.0',
    projectId: uuidv4(),
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    splitSymbol: '====',
    viewSettings: {
      thumbnailAspectRatio: '16:9',
      thumbnailSize: 'medium',
      imageFit: 'contain',
      fontSize: 13,
      colWidthText: 360,
      colWidthPrompt: 360,
      visibleCols: { text: true, prompt: true, image: true }
    },
    exportSettings: {
      textExportMode: 'with_index_title',
      promptExportMode: 'with_index_title',
      exportSeparator: '====',
      imageExportNameMode: 'simple_index'
    },
    items: []
  }
}

/** 确保项目目录结构完整（images/ 和 exports/） */
function ensureProjectDirs(projectDir: string): void {
  const imagesDir = path.join(projectDir, 'images')
  const exportsDir = path.join(projectDir, 'exports')
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true })
}

/** 读取并解析 project.json */
function readManifest(projectDir: string): ProjectManifest {
  const manifestPath = path.join(projectDir, 'project.json')
  const raw = fs.readFileSync(manifestPath, 'utf-8')
  return JSON.parse(raw) as ProjectManifest
}

/** 保存 project.json（格式化写入方便人类阅读） */
function writeManifest(projectDir: string, manifest: ProjectManifest): void {
  const manifestPath = path.join(projectDir, 'project.json')
  manifest.updatedAt = new Date().toISOString()
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

/** 注册所有项目文件系统相关的 IPC 处理器 */
export function registerProjectFsHandlers(): void {
  // 打开目录选择对话框（用于新建项目）
  ipcMain.handle('dialog:selectFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // 打开已有项目（选择项目文件夹）
  ipcMain.handle('dialog:openProject', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: '选择项目文件夹'
    })
    if (result.canceled) return { canceled: true }
    const projectDir = result.filePaths[0]
    const manifestPath = path.join(projectDir, 'project.json')
    if (!fs.existsSync(manifestPath)) {
      return { error: '该文件夹不是有效的分镜项目（缺少 project.json）' }
    }
    try {
      ensureProjectDirs(projectDir)
      const manifest = readManifest(projectDir)
      return { projectDir, manifest }
    } catch (e: unknown) {
      return { error: `project.json 解析失败: ${(e as Error).message}` }
    }
  })

  // 新建项目
  ipcMain.handle('project:create', async (_event, projectDir: string, projectName: string) => {
    try {
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }
      ensureProjectDirs(projectDir)
      const manifest = createDefaultManifest(projectName)
      writeManifest(projectDir, manifest)
      return { success: true, manifest }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // 保存项目
  ipcMain.handle('project:save', async (_event, projectDir: string, manifest: ProjectManifest) => {
    try {
      writeManifest(projectDir, manifest)
      return { success: true, updatedAt: manifest.updatedAt }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // 读取项目
  ipcMain.handle('project:load', async (_event, projectDir: string) => {
    try {
      const manifestPath = path.join(projectDir, 'project.json')
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: '项目文件不存在' }
      }
      ensureProjectDirs(projectDir)
      const manifest = readManifest(projectDir)
      return { success: true, manifest }
    } catch (e: unknown) {
      return { success: false, error: `读取项目失败: ${(e as Error).message}` }
    }
  })

  // 将外部图片复制到项目 images/ 并返回相对路径
  ipcMain.handle(
    'project:copyImage',
    async (_event, projectDir: string, sourcePath: string, itemIndex: number) => {
      try {
        const imagesDir = path.join(projectDir, 'images')
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })

        const ext = path.extname(sourcePath).toLowerCase()
        const allowed = ['.png', '.jpg', '.jpeg', '.webp']
        if (!allowed.includes(ext)) {
          return { success: false, error: `不支持的图片格式: ${ext}，仅支持 PNG/JPG/JPEG/WEBP` }
        }

        const originalName = path.basename(sourcePath, ext)
        const timestamp = Date.now()
        const indexStr = String(itemIndex).padStart(3, '0')
        const newFileName = `${indexStr}_${timestamp}_${originalName}${ext}`
        const destPath = path.join(imagesDir, newFileName)

        fs.copyFileSync(sourcePath, destPath)

        // 返回相对于项目根目录的路径
        const relativePath = path.join('images', newFileName).replace(/\\/g, '/')
        return { success: true, relativePath, fileName: newFileName }
      } catch (e: unknown) {
        return { success: false, error: `图片复制失败: ${(e as Error).message}` }
      }
    }
  )

  // 检查图片文件是否存在
  ipcMain.handle('project:checkImageExists', async (_event, projectDir: string, relativePath: string) => {
    const fullPath = path.join(projectDir, relativePath)
    return fs.existsSync(fullPath)
  })

  // 获取图片的完整绝对路径（供 renderer 显示用）
  ipcMain.handle('project:getImagePath', async (_event, projectDir: string, relativePath: string) => {
    return path.join(projectDir, relativePath)
  })

  // 打开图片所在文件夹并选中该文件
  ipcMain.handle('project:revealInExplorer', async (_event, projectDir: string, relativePath: string) => {
    const fullPath = path.join(projectDir, relativePath)
    shell.showItemInFolder(fullPath)
    return { success: true }
  })

  // 复制图片文件路径到剪贴板（通过 shell，避免直接操作 clipboard）
  ipcMain.handle('project:getAbsoluteImagePath', async (_event, projectDir: string, relativePath: string) => {
    return path.join(projectDir, relativePath).replace(/\\/g, '/')
  })

  // 选择保存文件对话框
  ipcMain.handle('dialog:saveFile', async (_event, filters: Electron.FileFilter[], defaultName?: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      filters,
      defaultPath: defaultName
    })
    if (result.canceled) return null
    return result.filePath
  })

  // 选择目标目录
  ipcMain.handle('dialog:selectExportFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择导出目录'
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // 写入文本文件
  ipcMain.handle('fs:writeTextFile', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // 读取文件为 base64（用于图片显示）
  ipcMain.handle('fs:readFileAsBase64', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: '文件不存在' }
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext
      return { success: true, base64: `data:image/${mime};base64,${data.toString('base64')}` }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // 原生拖出文件到 Windows 资源管理器
  // 使用 ipcMain.on + event.returnValue（sendSync）确保在 dragstart 事件内同步调用
  ipcMain.on('shell:startDrag', (event, filePaths: string | string[]) => {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
    const valid = paths.filter(p => fs.existsSync(p))
    event.returnValue = null
    if (valid.length === 0) return

    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAAJ0lEQVRYhe3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABKkDu9QAAAABJRU5ErkJggg=='
    )
    if (valid.length === 1) {
      event.sender.startDrag({ file: valid[0], icon })
    } else {
      event.sender.startDrag({ files: valid, icon } as Electron.Item)
    }
  })

  // 将多个图片文件写入系统剪贴板（CF_HDROP 格式），可在 Windows 资源管理器中粘贴
  ipcMain.handle('clipboard:copyFiles', (_event, filePaths: string[]) => {
    try {
      const valid = filePaths.filter(p => fs.existsSync(p))
      if (valid.length === 0) return { success: false, error: '文件不存在' }

      // 构造 CF_HDROP 二进制格式
      // DROPFILES 头（20 字节）：pFiles=20, pt=(0,0), fNC=0, fWide=1（Unicode）
      const header = Buffer.alloc(20)
      header.writeUInt32LE(20, 0)  // pFiles: 文件列表从第 20 字节开始
      header.writeUInt32LE(0, 4)   // pt.x
      header.writeUInt32LE(0, 8)   // pt.y
      header.writeUInt32LE(0, 12)  // fNC
      header.writeUInt32LE(1, 16)  // fWide = 1 → UTF-16LE

      // 每个路径以 null 终止的 UTF-16LE 字符串
      const fileListBuffers = valid.map(p => Buffer.from(p + '\0', 'utf16le'))
      // 末尾额外的空字符（双 null 终止符）
      fileListBuffers.push(Buffer.from('\0', 'utf16le'))

      const cfHdrop = Buffer.concat([header, ...fileListBuffers])
      clipboard.writeBuffer('CF_HDROP', cfHdrop)
      return { success: true, count: valid.length }
    } catch (e: unknown) {
      return { success: false, error: String(e) }
    }
  })
}
