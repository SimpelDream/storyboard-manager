import React, { useState, useCallback, useRef, useLayoutEffect } from 'react'
import type { StoryItem, ViewSettings } from '../types/project'
import { STATUS_CONFIG } from '../types/project'
import { formatIndex } from '../utils/normalizeIndex'
import ImageCell from './ImageCell'

interface Props {
  item: StoryItem
  projectDir: string
  viewSettings: ViewSettings
  colWidthText: number
  colWidthPrompt: number
  isFirst: boolean
  isLast: boolean
  isSelected: boolean
  isDragTarget: boolean
  isImageSelected: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, changes: Partial<StoryItem>) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
  onInsertBefore: (id: string) => void
  onInsertAfter: (id: string) => void
  onImageBound: (id: string, path: string, fileName: string) => void
  onImageCleared: (id: string) => void
  onToggleImageSelect: (id: string) => void
  onAbsPathReady: (id: string, absPath: string | null) => void
  getSelectedAbsPaths: () => string[]
  onInternalDragStart: (id: string) => void
  onInternalDrop: (targetId: string, modifiers: { ctrl: boolean; shift: boolean }) => void
}

/** 自动随内容高度伸缩的 textarea */
function AutoTextarea({
  value, onChange, placeholder, fontSize, minRows = 3
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  fontSize: number
  minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = Math.max(el.scrollHeight, fontSize * 1.6 * minRows) + 'px'
  }, [value, fontSize, minRows])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        resize: 'none',
        padding: 0,
        fontSize,
        lineHeight: 1.6,
        overflow: 'hidden',
        fontFamily: 'inherit',
        color: 'var(--text)',
        outline: 'none'
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

export default function StoryRow({
  item, projectDir, viewSettings, colWidthText, colWidthPrompt,
  isFirst, isLast, isSelected, isDragTarget, isImageSelected,
  onSelect, onUpdate, onMoveUp, onMoveDown, onDelete,
  onInsertBefore, onInsertAfter, onImageBound, onImageCleared,
  onToggleImageSelect, onAbsPathReady, getSelectedAbsPaths,
  onInternalDragStart, onInternalDrop
}: Props) {
  const [hovered, setHovered] = useState(false)
  const [showNote, setShowNote] = useState(!!item.note)

  const statusCfg = STATUS_CONFIG[item.status]
  const fs = viewSettings.fontSize ?? 13

  // 直接删除，无确认弹窗（内容会自动并入上一行）
  const handleDelete = useCallback(() => {
    onDelete(item.id)
  }, [item.id, onDelete])

  // 行底色只由"点击选中行"和"内部拖拽目标"决定，图片勾选不影响行底色
  const rowBg = isDragTarget
    ? 'rgba(99,102,241,0.07)'
    : isSelected
      ? 'rgba(99,102,241,0.04)'
      : 'var(--bg-card)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(item.id)}
      style={{
        display: 'flex',
        background: rowBg,
        borderBottom: '1px solid var(--border)',
        // 左侧指示线：选中行=蓝色，图片已勾选=绿色细线，默认=透明
        borderLeft: isSelected
          ? '3px solid var(--primary)'
          : isImageSelected
            ? '3px solid #10b981'
            : '3px solid transparent',
        minHeight: 80,
        position: 'relative',
        transition: 'background 0.12s, border-left-color 0.12s'
      }}
    >
      {/* 序号 + 状态 */}
      <div style={{
        width: Math.max(44, fs + 28), flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 10, gap: 4,
        borderRight: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: Math.max(11, fs - 1), fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {formatIndex(item.index)}
        </span>
        <span className="badge" style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: Math.max(10, fs - 2), padding: '1px 4px' }}>
          {statusCfg.label}
        </span>
      </div>

      {/* 故事列 */}
      {viewSettings.visibleCols?.text !== false && (
        <div style={{ width: colWidthText, flexShrink: 0, padding: '8px 10px', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <AutoTextarea value={item.text} onChange={v => onUpdate(item.id, { text: v })} placeholder="故事片段..." fontSize={fs} />
        </div>
      )}

      {/* 提示词列 */}
      {viewSettings.visibleCols?.prompt !== false && (
        <div style={{ width: colWidthPrompt, flexShrink: 0, padding: '8px 10px', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <AutoTextarea value={item.prompt} onChange={v => onUpdate(item.id, { prompt: v })} placeholder="分镜提示词..." fontSize={fs} />
        </div>
      )}

      {/* 图片 + 状态 + 备注列 */}
      {viewSettings.visibleCols?.image !== false && (
        <div style={{ flex: 1, minWidth: 0, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ImageCell
            item={item} projectDir={projectDir} viewSettings={viewSettings}
            isDragTarget={isDragTarget}
            isSelected={isImageSelected}
            onToggleSelect={onToggleImageSelect}
            onAbsPathReady={onAbsPathReady}
            getSelectedAbsPaths={getSelectedAbsPaths}
            onImageBound={onImageBound} onImageCleared={onImageCleared}
            onInternalDragStart={onInternalDragStart} onInternalDrop={onInternalDrop}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value as StoryItem['status'] })} style={{ fontSize: 11, padding: '2px 6px' }}>
              <option value="missing">未配图</option>
              <option value="usable">可用</option>
              <option value="needs_regen">需重绘</option>
              <option value="locked">已锁定</option>
            </select>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => setShowNote(v => !v)}>
              {showNote ? '▾ 备注' : '▸ 备注'}
            </button>
          </div>
          {showNote && (
            <AutoTextarea value={item.note ?? ''} onChange={v => onUpdate(item.id, { note: v })} placeholder="备注..." fontSize={12} />
          )}
        </div>
      )}

      {/* 行操作（悬停显示） */}
      {hovered && (
        <div
          style={{
            position: 'absolute', right: 6, top: 6,
            display: 'flex', gap: 3,
            background: 'rgba(255,255,255,0.96)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', padding: '2px 4px',
            boxShadow: 'var(--shadow)', zIndex: 10
          }}
          onClick={e => e.stopPropagation()}
        >
          <button className="btn btn-icon btn-ghost" style={{ fontSize: 13, width: 24, height: 24 }} title="上移" disabled={isFirst} onClick={() => onMoveUp(item.id)}>↑</button>
          <button className="btn btn-icon btn-ghost" style={{ fontSize: 13, width: 24, height: 24 }} title="下移" disabled={isLast} onClick={() => onMoveDown(item.id)}>↓</button>
          <button className="btn btn-icon btn-ghost" style={{ fontSize: 12, width: 28, height: 24 }} title="向前插入空行" onClick={() => onInsertBefore(item.id)}>+↑</button>
          <button className="btn btn-icon btn-ghost" style={{ fontSize: 12, width: 28, height: 24 }} title="向后插入空行" onClick={() => onInsertAfter(item.id)}>+↓</button>
          <button className="btn btn-icon btn-ghost" style={{ fontSize: 13, width: 24, height: 24, color: 'var(--danger)' }} title="删除（文本并入上一行）" onClick={handleDelete}>🗑</button>
        </div>
      )}
    </div>
  )
}
