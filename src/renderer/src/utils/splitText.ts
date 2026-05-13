/**
 * 将文本按分隔符切分为片段数组
 * @param text 待切分文本
 * @param separator 分隔符（字符串或正则字符串）
 * @param useRegex 是否将 separator 当作正则表达式处理
 * @returns 去除空白片段、保留内部换行的片段数组
 */
export function splitText(text: string, separator: string, useRegex = false): string[] {
  if (!text.trim()) return []

  let parts: string[]
  if (useRegex) {
    try {
      const regex = new RegExp(separator, 'g')
      parts = text.split(regex)
    } catch {
      // 正则无效时降级为普通字符串切分
      parts = text.split(separator)
    }
  } else {
    parts = text.split(separator)
  }

  // 保留内部换行，只去除首尾空白，过滤掉完全为空的片段
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}
