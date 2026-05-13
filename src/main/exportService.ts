import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

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

interface ExportImageOptions {
  projectDir: string
  targetDir: string
  items: StoryItem[]
  nameMode: 'simple_index' | 'index_with_original_name'
}

interface ExportReportEntry {
  index: number
  storyItemId: string
  textPreview: string
  promptPreview: string
  sourceImagePath: string
  exportedFileName: string
  status: 'exported' | 'skipped_missing_image' | 'skipped_no_image' | 'failed'
  message: string
}

/** 导出图片并生成报告 */
async function exportImages(opts: ExportImageOptions): Promise<ExportReportEntry[]> {
  const { projectDir, targetDir, items, nameMode } = opts
  const report: ExportReportEntry[] = []

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  let exportedCount = 0

  for (const item of items) {
    const indexStr = String(item.index).padStart(3, '0')

    // 无图绑定
    if (!item.imagePath) {
      report.push({
        index: item.index,
        storyItemId: item.id,
        textPreview: item.text.slice(0, 30),
        promptPreview: item.prompt.slice(0, 30),
        sourceImagePath: '',
        exportedFileName: '',
        status: 'skipped_no_image',
        message: '未绑定图片，跳过'
      })
      continue
    }

    const sourceFull = path.join(projectDir, item.imagePath)

    // 图片文件不存在
    if (!fs.existsSync(sourceFull)) {
      report.push({
        index: item.index,
        storyItemId: item.id,
        textPreview: item.text.slice(0, 30),
        promptPreview: item.prompt.slice(0, 30),
        sourceImagePath: item.imagePath,
        exportedFileName: '',
        status: 'skipped_missing_image',
        message: '图片文件丢失，跳过'
      })
      continue
    }

    const ext = path.extname(sourceFull).toLowerCase()
    let exportName: string

    if (nameMode === 'simple_index') {
      exportName = `${indexStr}${ext}`
    } else {
      const originalName = item.imageFileName
        ? path.basename(item.imageFileName, path.extname(item.imageFileName))
        : path.basename(sourceFull, ext)
      exportName = `${indexStr}_${originalName}${ext}`
    }

    const destPath = path.join(targetDir, exportName)

    try {
      fs.copyFileSync(sourceFull, destPath)
      exportedCount++
      report.push({
        index: item.index,
        storyItemId: item.id,
        textPreview: item.text.slice(0, 30),
        promptPreview: item.prompt.slice(0, 30),
        sourceImagePath: item.imagePath,
        exportedFileName: exportName,
        status: 'exported',
        message: '导出成功'
      })
    } catch (e: unknown) {
      report.push({
        index: item.index,
        storyItemId: item.id,
        textPreview: item.text.slice(0, 30),
        promptPreview: item.prompt.slice(0, 30),
        sourceImagePath: item.imagePath,
        exportedFileName: '',
        status: 'failed',
        message: `导出失败: ${(e as Error).message}`
      })
    }
  }

  return report
}

/** 将导出报告转换为 CSV 文本 */
function reportToCsv(report: ExportReportEntry[]): string {
  const headers = ['index', 'storyItemId', 'textPreview', 'promptPreview', 'sourceImagePath', 'exportedFileName', 'status', 'message']
  const rows = report.map((r) =>
    headers
      .map((h) => {
        const val = String((r as Record<string, unknown>)[h] ?? '')
        return `"${val.replace(/"/g, '""')}"`
      })
      .join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

/** 注册导出相关 IPC 处理器 */
export function registerExportHandlers(): void {
  // 按顺序导出图片
  ipcMain.handle('export:images', async (_event, opts: ExportImageOptions) => {
    try {
      const report = await exportImages(opts)
      const reportJson = JSON.stringify(report, null, 2)
      const reportCsv = reportToCsv(report)

      // 写入报告文件到目标目录
      fs.writeFileSync(path.join(opts.targetDir, 'export_report.json'), reportJson, 'utf-8')
      fs.writeFileSync(path.join(opts.targetDir, 'export_report.csv'), reportCsv, 'utf-8')

      const exported = report.filter((r) => r.status === 'exported').length
      const skipped = report.filter((r) => r.status.startsWith('skipped')).length
      const failed = report.filter((r) => r.status === 'failed').length

      return { success: true, exported, skipped, failed, targetDir: opts.targetDir }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // 复制单个图片文件
  ipcMain.handle('export:copyFile', async (_event, sourcePath: string, destPath: string) => {
    try {
      const dir = path.dirname(destPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.copyFileSync(sourcePath, destPath)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })
}
