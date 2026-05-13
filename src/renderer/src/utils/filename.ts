/**
 * 清理文件名中的非法字符（Windows/Unix 通用）
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
}

/**
 * 格式化序号用于文件名，例如 1 -> "001"
 */
export function padIndex(index: number): string {
  return String(index).padStart(3, '0')
}
