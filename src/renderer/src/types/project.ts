/** 单个分镜行数据结构 */
export interface StoryItem {
  id: string
  index: number
  text: string
  prompt: string
  imagePath?: string
  imageFileName?: string
  status: 'missing' | 'usable' | 'needs_regen' | 'locked'
  note?: string
}

/** 缩略图显示设置 */
export interface ViewSettings {
  thumbnailAspectRatio: '16:9' | '9:16' | 'original'
  thumbnailSize: 'small' | 'medium' | 'large' | 'custom'
  customThumbnailWidth?: number
  imageFit: 'contain' | 'cover'
  /** 文本编辑区字号（px），默认 13 */
  fontSize: number
  /** 故事列宽度（px），默认 360 */
  colWidthText: number
  /** 提示词列宽度（px），默认 360 */
  colWidthPrompt: number
  /** 各列是否显示 */
  visibleCols: { text: boolean; prompt: boolean; image: boolean }
}

/** 导出设置 */
export interface ExportSettings {
  textExportMode: 'content_only' | 'with_index_title'
  promptExportMode: 'content_only' | 'with_index_title'
  exportSeparator: string
  imageExportNameMode: 'simple_index' | 'index_with_original_name'
}

/** 项目清单（对应 project.json） */
export interface ProjectManifest {
  version: string
  projectId: string
  projectName: string
  createdAt: string
  updatedAt: string
  splitSymbol: string
  viewSettings: ViewSettings
  exportSettings: ExportSettings
  items: StoryItem[]
}

/** 最近打开的项目记录 */
export interface RecentProject {
  projectDir: string
  projectName: string
  openedAt: string
}

/** 状态标签配置 */
export const STATUS_CONFIG = {
  missing: { label: '未配图', color: '#9ca3af', bg: '#f3f4f6' },
  usable: { label: '可用', color: '#16a34a', bg: '#dcfce7' },
  needs_regen: { label: '需重绘', color: '#d97706', bg: '#fef3c7' },
  locked: { label: '已锁定', color: '#7c3aed', bg: '#ede9fe' }
} as const

/** 缩略图尺寸映射（宽度px） */
export const THUMBNAIL_SIZE_MAP = {
  small: 120,
  medium: 180,
  large: 260
} as const

/** 获取缩略图实际宽度 */
export function getThumbnailWidth(settings: ViewSettings): number {
  if (settings.thumbnailSize === 'custom' && settings.customThumbnailWidth) {
    return settings.customThumbnailWidth
  }
  return THUMBNAIL_SIZE_MAP[settings.thumbnailSize as keyof typeof THUMBNAIL_SIZE_MAP] ?? 180
}

/** 根据比例计算缩略图高度 */
export function getThumbnailHeight(settings: ViewSettings): number | undefined {
  const w = getThumbnailWidth(settings)
  if (settings.thumbnailAspectRatio === '16:9') return Math.round((w * 9) / 16)
  if (settings.thumbnailAspectRatio === '9:16') return Math.round((w * 16) / 9)
  return undefined
}

/** 默认 ViewSettings */
export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  thumbnailAspectRatio: '16:9',
  thumbnailSize: 'medium',
  imageFit: 'contain',
  fontSize: 13,
  colWidthText: 360,
  colWidthPrompt: 360,
  visibleCols: { text: true, prompt: true, image: true }
}

/** preload 暴露的 API 类型定义 */
export interface WindowApi {
  selectFolder: () => Promise<string | null>
  openProject: () => Promise<{ canceled?: boolean; error?: string; projectDir?: string; manifest?: ProjectManifest }>
  saveFileDialog: (filters: { name: string; extensions: string[] }[], defaultName?: string) => Promise<string | null>
  selectExportFolder: () => Promise<string | null>

  createProject: (projectDir: string, projectName: string) => Promise<{ success: boolean; manifest?: ProjectManifest; error?: string }>
  saveProject: (projectDir: string, manifest: ProjectManifest) => Promise<{ success: boolean; updatedAt?: string; error?: string }>
  loadProject: (projectDir: string) => Promise<{ success: boolean; manifest?: ProjectManifest; error?: string }>
  copyImage: (projectDir: string, sourcePath: string, itemIndex: number) => Promise<{ success: boolean; relativePath?: string; fileName?: string; error?: string }>
  checkImageExists: (projectDir: string, relativePath: string) => Promise<boolean>
  getImagePath: (projectDir: string, relativePath: string) => Promise<string>
  revealInExplorer: (projectDir: string, relativePath: string) => Promise<{ success: boolean }>
  getAbsoluteImagePath: (projectDir: string, relativePath: string) => Promise<string>
  startDragFile: (filePaths: string | string[]) => void
  copyFilesToClipboard: (filePaths: string[]) => Promise<{ success: boolean; count?: number; error?: string }>

  listRecentProjects: () => Promise<RecentProject[]>
  addRecentProject: (projectDir: string, projectName: string) => Promise<{ success: boolean }>
  removeRecentProject: (projectDir: string) => Promise<{ success: boolean }>

  writeTextFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  readFileAsBase64: (filePath: string) => Promise<{ success: boolean; base64?: string; error?: string }>

  exportImages: (opts: unknown) => Promise<{ success: boolean; exported?: number; skipped?: number; failed?: number; targetDir?: string; error?: string }>
  exportCopyFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    api: WindowApi
  }
}
