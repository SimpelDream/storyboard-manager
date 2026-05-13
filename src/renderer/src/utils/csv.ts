import type { StoryItem } from '../types/project'

/**
 * 将 StoryItem 数组转换为 CSV 文本
 */
export function itemsToCsv(items: StoryItem[]): string {
  const headers = ['index', 'id', 'text', 'prompt', 'imageFileName', 'imagePath', 'status', 'note']

  const escape = (val: unknown): string => {
    const str = String(val ?? '')
    // CSV 字段中如果包含逗号、换行或双引号，需要用双引号包裹并转义内部双引号
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = items.map((item) =>
    headers
      .map((h) => escape((item as unknown as Record<string, unknown>)[h]))
      .join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
