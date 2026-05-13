import React from 'react'
import type { StoryItem } from '../types/project'

interface Props {
  items: StoryItem[]
  onClose: () => void
}

export default function IntegrityStats({ items, onClose }: Props) {
  const total = items.length
  const hasText = items.filter(i => i.text.trim()).length
  const hasPrompt = items.filter(i => i.prompt.trim()).length
  const hasImage = items.filter(i => i.imagePath).length
  const textOnlyNoPrompt = items.filter(i => i.text.trim() && !i.prompt.trim()).length
  const promptOnlyNoText = items.filter(i => i.prompt.trim() && !i.text.trim()).length
  const missing = items.filter(i => i.status === 'missing').length
  const usable = items.filter(i => i.status === 'usable').length
  const needsRegen = items.filter(i => i.status === 'needs_regen').length
  const locked = items.filter(i => i.status === 'locked').length

  const rows = [
    { label: '总行数', value: total, highlight: false },
    { label: '有故事文本的行', value: hasText, highlight: false },
    { label: '有分镜提示词的行', value: hasPrompt, highlight: false },
    { label: '有图片绑定的行', value: hasImage, highlight: false },
    { label: '', value: null, highlight: false },
    { label: '有文本但无提示词', value: textOnlyNoPrompt, highlight: textOnlyNoPrompt > 0 },
    { label: '有提示词但无文本', value: promptOnlyNoText, highlight: promptOnlyNoText > 0 },
    { label: '', value: null, highlight: false },
    { label: '状态：未配图 (missing)', value: missing, highlight: false },
    { label: '状态：可用 (usable)', value: usable, highlight: false },
    { label: '状态：需要重绘 (needs_regen)', value: needsRegen, highlight: needsRegen > 0 },
    { label: '状态：已锁定 (locked)', value: locked, highlight: false }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          行完整性统计
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((row, i) => {
                if (row.value === null) {
                  return <tr key={i}><td colSpan={2} style={{ padding: '4px 0' }}><div className="divider" /></td></tr>
                }
                return (
                  <tr key={i}>
                    <td style={{ padding: '6px 4px', fontSize: 13, color: row.highlight ? '#b45309' : 'var(--text)' }}>
                      {row.highlight && '⚠ '}{row.label}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: row.highlight ? '#b45309' : 'var(--text)' }}>
                      {row.value}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
