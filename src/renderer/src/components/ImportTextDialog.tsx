import React, { useState } from 'react'
import { splitText } from '../utils/splitText'
import { normalizeIndex } from '../utils/normalizeIndex'
import { createEmptyItem } from '../store/projectStore'
import type { StoryItem } from '../types/project'
import { useToast } from './Toast'

type ImportMode = 'overwrite' | 'from_start' | 'from_selected' | 'append'

interface Props {
  mode: 'text' | 'prompt'
  existingItems: StoryItem[]
  selectedItemId: string | null
  onConfirm: (items: StoryItem[]) => void
  onClose: () => void
}

export default function ImportTextDialog({ mode, existingItems, selectedItemId, onConfirm, onClose }: Props) {
  const { toast } = useToast()
  const [inputText, setInputText] = useState('')
  const [separator, setSeparator] = useState('====')
  const [useRegex, setUseRegex] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('overwrite')
  const [step, setStep] = useState<'input' | 'strategy'>(existingItems.length > 0 ? 'input' : 'input')

  const fieldLabel = mode === 'text' ? '故事文本' : '分镜提示词'
  const field = mode === 'text' ? 'text' : 'prompt'

  /** 预览切分结果 */
  const preview = inputText.trim()
    ? splitText(inputText, separator, useRegex)
    : []

  function handleNext() {
    if (!inputText.trim()) { toast('请粘贴内容', 'warning'); return }
    if (preview.length === 0) { toast('切分后没有有效片段，请检查分隔符', 'warning'); return }
    if (existingItems.length > 0) {
      setStep('strategy')
    } else {
      // 无现有行，直接创建
      doImport('append')
    }
  }

  function doImport(mode: ImportMode) {
    const fragments = splitText(inputText, separator, useRegex)
    if (fragments.length === 0) { toast('没有有效片段', 'warning'); return }

    let result: StoryItem[] = [...existingItems]

    if (existingItems.length === 0 || mode === 'append') {
      // 追加新行
      const startIndex = existingItems.length + 1
      const newItems = fragments.map((frag, i) => ({
        ...createEmptyItem(startIndex + i),
        [field]: frag
      }))
      result = normalizeIndex([...existingItems, ...newItems])
    } else if (mode === 'overwrite') {
      // 覆盖 field，多出部分新增行
      result = [...existingItems]
      fragments.forEach((frag, i) => {
        if (i < result.length) {
          result[i] = { ...result[i], [field]: frag }
        } else {
          result.push({ ...createEmptyItem(0), [field]: frag })
        }
      })
      result = normalizeIndex(result)
    } else if (mode === 'from_start') {
      result = [...existingItems]
      fragments.forEach((frag, i) => {
        if (i < result.length) {
          result[i] = { ...result[i], [field]: frag }
        } else {
          result.push({ ...createEmptyItem(0), [field]: frag })
        }
      })
      result = normalizeIndex(result)
    } else if (mode === 'from_selected') {
      const startIdx = selectedItemId
        ? existingItems.findIndex(i => i.id === selectedItemId)
        : 0
      const realStart = startIdx < 0 ? 0 : startIdx
      result = [...existingItems]
      fragments.forEach((frag, i) => {
        const pos = realStart + i
        if (pos < result.length) {
          result[pos] = { ...result[pos], [field]: frag }
        } else {
          result.push({ ...createEmptyItem(0), [field]: frag })
        }
      })
      result = normalizeIndex(result)
    }

    onConfirm(result)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          导入{fieldLabel}
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {step === 'input' && (
          <>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>粘贴完整{fieldLabel}</label>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`在此粘贴完整的${fieldLabel}，用分隔符切分...`}
                  style={{ marginTop: 6, height: 200 }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label>分隔符</label>
                  <input
                    type="text"
                    value={separator}
                    onChange={e => setSeparator(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 2 }}>
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={e => setUseRegex(e.target.checked)}
                  />
                  正则模式
                </label>
              </div>
              {preview.length > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    预览：将切分为 <strong>{preview.length}</strong> 个片段
                  </div>
                  <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {preview.slice(0, 8).map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '3px 6px', background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{String(i+1).padStart(3,'0')}</span>
                        {p.replace(/\n/g, ' ↵ ')}
                      </div>
                    ))}
                    {preview.length > 8 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px' }}>...还有 {preview.length - 8} 个片段</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={handleNext}>
                {existingItems.length > 0 ? '下一步' : '确认导入'}
              </button>
            </div>
          </>
        )}

        {step === 'strategy' && (
          <>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                当前项目已有 <strong>{existingItems.length}</strong> 行，导入 <strong>{preview.length}</strong> 个片段。请选择导入策略：
              </div>
              {(
                [
                  { value: 'overwrite', label: `覆盖当前所有${fieldLabel}`, desc: `只替换 ${field} 字段，其他字段（提示词/图片）保持不变` },
                  { value: 'from_start', label: '从第一行开始顺序写入', desc: '超出现有行数时自动新增' },
                  { value: 'from_selected', label: `从当前选中行开始写入${selectedItemId ? '' : '（未选中行，从第一行开始）'}`, desc: '向后依次写入，超出时自动新增' },
                  { value: 'append', label: '追加为新行', desc: '所有片段作为新行追加到末尾' }
                ] as { value: ImportMode; label: string; desc: string }[]
              ).map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${importMode === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                    background: importMode === opt.value ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value={opt.value}
                    checked={importMode === opt.value}
                    onChange={() => setImportMode(opt.value)}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setStep('input')}>← 返回</button>
              <button className="btn" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={() => doImport(importMode)}>确认导入</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
