import React from 'react'
import type { StoryItem } from '../types/project'
import { formatIndex } from '../utils/normalizeIndex'

interface Props {
  srcItem: StoryItem
  tgtItem: StoryItem
  isCtrl: boolean
  onSwap: () => void
  onOverwrite: () => void
  onCancel: () => void
}

export default function InternalDropDialog({ srcItem, tgtItem, isCtrl, onSwap, onOverwrite, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-header">
          {isCtrl ? '复制绑定确认' : '图片槽冲突'}
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-muted)' }}>
            目标槽 <strong>【{formatIndex(tgtItem.index)}】</strong> 已有图片绑定。
            {isCtrl ? '按住 Ctrl 拖动，请选择操作：' : '请选择操作：'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!isCtrl && (
              <button
                className="btn"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={onSwap}
              >
                🔄 交换两格图片
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {formatIndex(srcItem.index)} ↔ {formatIndex(tgtItem.index)}
                </span>
              </button>
            )}
            <button
              className="btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={onOverwrite}
            >
              {isCtrl ? '📋 复制绑定到目标槽' : '⬇ 覆盖目标图片'}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                {isCtrl ? '源槽保留，目标槽引用同一张图' : '源槽清空，目标槽绑定源图片'}
              </span>
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={onCancel}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
