import React, { useState } from 'react'
import type { ViewSettings } from '../types/project'
import { DEFAULT_VIEW_SETTINGS } from '../types/project'

interface Props {
  settings: ViewSettings
  onSave: (settings: Partial<ViewSettings>) => void
  onClose: () => void
}

export default function ThumbnailSettingsDialog({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<ViewSettings>({ ...DEFAULT_VIEW_SETTINGS, ...settings })
  const set = <K extends keyof ViewSettings>(key: K, val: ViewSettings[K]) => setLocal(s => ({ ...s, [key]: val }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          视图设置
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 缩略图比例 */}
          <div>
            <label>缩略图比例</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['16:9', '9:16', 'original'] as const).map(ratio => (
                <button key={ratio} className="btn"
                  style={local.thumbnailAspectRatio === ratio ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                  onClick={() => set('thumbnailAspectRatio', ratio)}>
                  {ratio === '16:9' ? '横 16:9' : ratio === '9:16' ? '竖 9:16' : '原图比例'}
                </button>
              ))}
            </div>
          </div>

          {/* 缩略图尺寸 */}
          <div>
            <label>缩略图尺寸</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {(['small', 'medium', 'large', 'custom'] as const).map(size => (
                <button key={size} className="btn"
                  style={local.thumbnailSize === size ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
                  onClick={() => set('thumbnailSize', size)}>
                  {size === 'small' ? '小(120)' : size === 'medium' ? '中(180)' : size === 'large' ? '大(260)' : '自定义'}
                </button>
              ))}
            </div>
            {local.thumbnailSize === 'custom' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label>宽度 (px)</label>
                <input type="number" value={local.customThumbnailWidth ?? 200}
                  onChange={e => set('customThumbnailWidth', Number(e.target.value))}
                  style={{ width: 90 }} min={60} max={600} />
              </div>
            )}
          </div>

          {/* 图片适配 */}
          <div>
            <label>图片适配方式</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['contain', 'cover'] as const).map(fit => (
                <button key={fit} className="btn"
                  style={{ flex: 1, justifyContent: 'center', ...(local.imageFit === fit ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}) }}
                  onClick={() => set('imageFit', fit)}>
                  {fit === 'contain' ? 'Contain（完整显示）' : 'Cover（填满裁切）'}
                </button>
              ))}
            </div>
          </div>

          {/* 字号 */}
          <div>
            <label>文本字号 (px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input type="range" min={10} max={24} value={local.fontSize ?? 13}
                onChange={e => set('fontSize', Number(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>{local.fontSize ?? 13}</span>
            </div>
          </div>

          {/* 列默认宽度 */}
          <div>
            <label>列宽设置 (px，也可直接拖动列边框)</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>故事列</div>
                <input type="number" value={local.colWidthText ?? 360}
                  onChange={e => set('colWidthText', Math.max(120, Number(e.target.value)))}
                  min={120} max={1200} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>提示词列</div>
                <input type="number" value={local.colWidthPrompt ?? 360}
                  onChange={e => set('colWidthPrompt', Math.max(120, Number(e.target.value)))}
                  min={120} max={1200} />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => { onSave(local); onClose() }}>保存设置</button>
        </div>
      </div>
    </div>
  )
}
