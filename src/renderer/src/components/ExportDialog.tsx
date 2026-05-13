import React, { useState } from 'react'
import type { StoryItem, ExportSettings } from '../types/project'
import { formatIndex } from '../utils/normalizeIndex'
import { itemsToCsv } from '../utils/csv'
import { useToast } from './Toast'

type ExportTarget = 'json' | 'csv' | 'text' | 'prompt' | 'images'

interface Props {
  items: StoryItem[]
  projectDir: string
  exportSettings: ExportSettings
  manifest: unknown
  onClose: () => void
}

export default function ExportDialog({ items, projectDir, exportSettings, manifest, onClose }: Props) {
  const { toast } = useToast()
  const [target, setTarget] = useState<ExportTarget>('text')
  const [exportAll, setExportAll] = useState(true)
  const [skipEmpty, setSkipEmpty] = useState(true)
  const [sepMode, setSepMode] = useState<'blank_line' | 'separator' | 'title'>(
    exportSettings.textExportMode === 'with_index_title' ? 'title' : 'separator'
  )
  const [sep, setSep] = useState(exportSettings.exportSeparator || '====')
  const [nameMode, setNameMode] = useState<'simple_index' | 'index_with_original_name'>(
    exportSettings.imageExportNameMode
  )
  const [exporting, setExporting] = useState(false)

  const targetItems = exportAll ? items : items

  /** 构建文本/提示词导出内容 */
  function buildTextContent(field: 'text' | 'prompt'): string {
    const rows = targetItems.filter(i => !skipEmpty || (field === 'text' ? i.text.trim() : i.prompt.trim()))
    if (sepMode === 'title') {
      return rows.map(i => `【${formatIndex(i.index)}】\n${field === 'text' ? i.text : i.prompt}`).join('\n\n')
    } else if (sepMode === 'blank_line') {
      return rows.map(i => field === 'text' ? i.text : i.prompt).join('\n\n')
    } else {
      return rows.map(i => field === 'text' ? i.text : i.prompt).join(`\n${sep}\n`)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      if (target === 'json') {
        const filePath = await window.api.saveFileDialog(
          [{ name: 'JSON 文件', extensions: ['json'] }],
          'project.json'
        )
        if (!filePath) { setExporting(false); return }
        const result = await window.api.writeTextFile(filePath, JSON.stringify(manifest, null, 2))
        if (!result.success) throw new Error(result.error)
        toast('JSON 已导出', 'success')
        onClose()
      } else if (target === 'csv') {
        const filePath = await window.api.saveFileDialog(
          [{ name: 'CSV 文件', extensions: ['csv'] }],
          'storyboard.csv'
        )
        if (!filePath) { setExporting(false); return }
        const result = await window.api.writeTextFile(filePath, itemsToCsv(targetItems))
        if (!result.success) throw new Error(result.error)
        toast('CSV 已导出', 'success')
        onClose()
      } else if (target === 'text') {
        const filePath = await window.api.saveFileDialog(
          [{ name: '文本文件', extensions: ['txt'] }],
          'story_text.txt'
        )
        if (!filePath) { setExporting(false); return }
        const result = await window.api.writeTextFile(filePath, buildTextContent('text'))
        if (!result.success) throw new Error(result.error)
        toast('故事文本已导出', 'success')
        onClose()
      } else if (target === 'prompt') {
        const filePath = await window.api.saveFileDialog(
          [{ name: '文本文件', extensions: ['txt'] }],
          'storyboard_prompts.txt'
        )
        if (!filePath) { setExporting(false); return }
        const result = await window.api.writeTextFile(filePath, buildTextContent('prompt'))
        if (!result.success) throw new Error(result.error)
        toast('分镜提示词已导出', 'success')
        onClose()
      } else if (target === 'images') {
        const targetDir = await window.api.selectExportFolder()
        if (!targetDir) { setExporting(false); return }
        const result = await window.api.exportImages({
          projectDir,
          targetDir,
          items: targetItems,
          nameMode
        })
        if (!result.success) throw new Error(result.error)
        toast(
          `导出完成：成功 ${result.exported} 张，跳过 ${result.skipped} 条，失败 ${result.failed} 条\n目标目录：${result.targetDir}`,
          result.failed! > 0 ? 'warning' : 'success'
        )
        onClose()
      }
    } catch (e: unknown) {
      toast(`导出失败: ${(e as Error).message}`, 'error')
    }
    setExporting(false)
  }

  const tabs: { key: ExportTarget; label: string }[] = [
    { key: 'text', label: '故事文本' },
    { key: 'prompt', label: '分镜提示词' },
    { key: 'images', label: '导出图片' },
    { key: 'json', label: '项目 JSON' },
    { key: 'csv', label: '表格 CSV' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          导出
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 标签切换 */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                className="btn btn-sm"
                style={target === t.key ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                onClick={() => setTarget(t.key)}
              >{t.label}</button>
            ))}
          </div>

          {/* 文本/提示词选项 */}
          {(target === 'text' || target === 'prompt') && (
            <>
              <div>
                <label>分隔方式</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {[
                    { value: 'title', label: '带序号标题' },
                    { value: 'blank_line', label: '空行分隔' },
                    { value: 'separator', label: '固定符号分隔' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className="btn btn-sm"
                      style={sepMode === opt.value ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                      onClick={() => setSepMode(opt.value as typeof sepMode)}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              {sepMode === 'separator' && (
                <div>
                  <label>分隔符内容</label>
                  <input type="text" value={sep} onChange={e => setSep(e.target.value)} style={{ marginTop: 6 }} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={skipEmpty} onChange={e => setSkipEmpty(e.target.checked)} />
                跳过空内容的行
              </label>
            </>
          )}

          {/* 图片导出选项 */}
          {target === 'images' && (
            <>
              <div>
                <label>文件命名方式</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={nameMode === 'simple_index' ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                    onClick={() => setNameMode('simple_index')}
                  >简洁编号（001.png）</button>
                  <button
                    className="btn btn-sm"
                    style={nameMode === 'index_with_original_name' ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                    onClick={() => setNameMode('index_with_original_name')}
                  >编号加原名（001_xxx.png）</button>
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
                <div>• 只导出已绑定图片的行，无图行跳过</div>
                <div>• 同一张图片被多行引用时，按行分别导出副本</div>
                <div>• 导出后生成 export_report.json 和 export_report.csv</div>
                <div>• 不修改项目原始数据和图片文件</div>
              </div>
            </>
          )}

          {/* JSON/CSV 说明 */}
          {target === 'json' && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              导出完整 project.json 副本，不修改当前项目数据。
            </div>
          )}
          {target === 'csv' && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              导出当前项目的表格数据（index / id / text / prompt / imageFileName / imagePath / status / note）。
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            共 {targetItems.length} 行数据
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  )
}
