import React from 'react'
import type { StoryItem, ViewSettings } from '../types/project'

interface Props {
  projectName: string
  isDirty: boolean
  isSaving: boolean
  lastSaveTime: string | null
  items: StoryItem[]
  viewSettings: ViewSettings
  onUpdateView: (s: Partial<ViewSettings>) => void
  onImportText: () => void
  onImportPrompt: () => void
  onExport: () => void
  onThumbnailSettings: () => void
  onIntegrityStats: () => void
  onSave: () => void
  onAddRow: () => void
  onCloseProject: () => void
}

export default function Toolbar({
  projectName, isDirty, isSaving, lastSaveTime, items, viewSettings,
  onUpdateView, onImportText, onImportPrompt, onExport,
  onThumbnailSettings, onIntegrityStats, onSave, onAddRow, onCloseProject
}: Props) {
  const hasText = items.filter(i => i.text.trim()).length
  const hasPrompt = items.filter(i => i.prompt.trim()).length
  const hasImage = items.filter(i => i.imagePath).length

  const vis = viewSettings.visibleCols ?? { text: true, prompt: true, image: true }
  const fontSize = viewSettings.fontSize ?? 13

  function formatSaveTime(iso: string | null) {
    if (!iso) return ''
    try { return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
    catch { return '' }
  }

  const Divider = () => <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      {/* 返回 + 项目名 */}
      <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCloseProject} title="返回首页">← 首页</button>
      <span style={{ fontWeight: 700, fontSize: 15, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName}</span>
      {isDirty && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>●</span>}

      <Divider />

      {/* 导入 */}
      <button className="btn" style={{ fontSize: 13 }} onClick={onImportText}>📥 导入故事</button>
      <button className="btn" style={{ fontSize: 13 }} onClick={onImportPrompt}>📥 导入提示词</button>

      <Divider />

      {/* 导出 */}
      <button className="btn" style={{ fontSize: 13 }} onClick={onExport}>📤 导出</button>

      <Divider />

      {/* 视图设置 */}
      <button className="btn" style={{ fontSize: 13 }} onClick={onThumbnailSettings}>🖼 视图设置</button>
      <button className="btn" style={{ fontSize: 13 }} onClick={onIntegrityStats}>📊 统计</button>

      <Divider />

      {/* 列显示控制 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>显示列：</span>
        {([
          { key: 'text', label: '故事' },
          { key: 'prompt', label: '分镜' },
          { key: 'image', label: '图片' }
        ] as { key: keyof typeof vis; label: string }[]).map(col => (
          <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={vis[col.key]}
              onChange={e => onUpdateView({ visibleCols: { ...vis, [col.key]: e.target.checked } })}
            />
            {col.label}
          </label>
        ))}
      </div>

      <Divider />

      {/* 字号 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>字号</span>
        <button className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0, fontSize: 16 }}
          onClick={() => onUpdateView({ fontSize: Math.max(10, fontSize - 1) })}>−</button>
        <span style={{ fontSize: 14, minWidth: 26, textAlign: 'center', fontWeight: 600 }}>{fontSize}</span>
        <button className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0, fontSize: 16 }}
          onClick={() => onUpdateView({ fontSize: Math.min(24, fontSize + 1) })}>＋</button>
      </div>

      {/* 弹性空白 */}
      <div style={{ flex: 1 }} />

      {/* 新增行 + 统计 + 保存 */}
      <button className="btn" style={{ fontSize: 13 }} onClick={onAddRow}>＋ 添加行</button>

      <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        故事{hasText} 分镜{hasPrompt} 图片{hasImage}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {lastSaveTime && !isDirty && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>已保存 {formatSaveTime(lastSaveTime)}</span>
        )}
        <button className={`btn ${isDirty ? 'btn-primary' : ''}`} style={{ fontSize: 13 }} onClick={onSave} disabled={isSaving} title="保存 (Ctrl+S)">
          {isSaving ? '保存中...' : '💾 保存'}
        </button>
      </div>
    </div>
  )
}
