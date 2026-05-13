import type { StoryItem } from '../types/project'

/**
 * 重新整理 StoryItem 数组的 index，保证从 1 开始连续递增
 */
export function normalizeIndex(items: StoryItem[]): StoryItem[] {
  return items.map((item, i) => ({ ...item, index: i + 1 }))
}

/**
 * 生成格式化的序号字符串，例如 001、012、123
 */
export function formatIndex(index: number): string {
  return String(index).padStart(3, '0')
}
