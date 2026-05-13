import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { StoryItem, ViewSettings } from '../types/project'
import { getThumbnailWidth, getThumbnailHeight } from '../types/project'
import ImagePreviewModal from './ImagePreviewModal'
import { useToast } from './Toast'

interface Props {
  item: StoryItem
  projectDir: string
  viewSettings: ViewSettings
  isDragTarget?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onAbsPathReady?: (id: string, absPath: string | null) => void
  onImageBound: (id: string, relativePath: string, fileName: string) => void
  onImageCleared: (id: string) => void
  onInternalDragStart?: (id: string) => void
  onInternalDrop?: (targetId: string, modifiers: { ctrl: boolean; shift: boolean }) => void
  getSelectedAbsPaths?: () => string[]
}

const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp']

export default function ImageCell({
  item, projectDir, viewSettings, isDragTarget,
  isSelected, onToggleSelect, onAbsPathReady,
  onImageBound, onImageCleared,
  onInternalDragStart, onInternalDrop,
  getSelectedAbsPaths
}: Props) {
  const { toast } = useToast()
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [absPath, setAbsPath] = useState<string | null>(null)
  const [imgMissing, setImgMissing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [hovered, setHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const thumbW = getThumbnailWidth(viewSettings)
  const thumbH = getThumbnailHeight(viewSettings)

  const loadImage = useCallback(async () => {
    if (!item.imagePath) {
      setImgSrc(null); setAbsPath(null); setImgMissing(false)
      onAbsPathReady?.(item.id, null)
      return
    }
    const exists = await window.api.checkImageExists(projectDir, item.imagePath)
    if (!exists) {
      setImgSrc(null); setAbsPath(null); setImgMissing(true)
      onAbsPathReady?.(item.id, null)
      return
    }
    setImgMissing(false)
    const full = await window.api.getImagePath(projectDir, item.imagePath)
    setAbsPath(full)
    onAbsPathReady?.(item.id, full)
    setImgSrc(`file:///${full.replace(/\\/g, '/')}`)
  }, [item.imagePath, item.id, projectDir, onAbsPathReady])

  useEffect(() => { loadImage() }, [loadImage])

  useEffect(() => {
    if (!showMenu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMenu])

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const internalId = e.dataTransfer.getData('application/x-storyboard-item')
    if (internalId) {
      if (internalId !== item.id && onInternalDrop) onInternalDrop(item.id, { ctrl: e.ctrlKey, shift: e.shiftKey })
      return
    }
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const file = files[0]
    const ext = ('.' + file.name.split('.').pop()!.toLowerCase())
    if (!SUPPORTED_EXTS.includes(ext)) { toast(`不支持格式 "${ext}"，仅支持 PNG/JPG/JPEG/WEBP`, 'error'); return }
    if (item.imagePath && !window.confirm('该槽位已有图片，确认替换绑定？')) return
    const result = await window.api.copyImage(projectDir, (file as File & { path: string }).path, item.index)
    if (!result.success || !result.relativePath || !result.fileName) { toast(result.error ?? '导入失败', 'error'); return }
    onImageBound(item.id, result.relativePath, result.fileName)
    toast('图片已导入', 'success')
  }

  function handleDragStart(e: React.DragEvent) {
    if (!item.imagePath || !absPath) return
    // 使用自定义 MIME 类型携带内部 ID，避免外部应用（浏览器/资源管理器）读到该字符串
    e.dataTransfer.setData('application/x-storyboard-item', item.id)
    e.dataTransfer.effectAllowed = e.ctrlKey ? 'copy' : 'move'
    onInternalDragStart?.(item.id)
    const paths = getSelectedAbsPaths?.() ?? []
    const dragPaths = paths.length > 0 ? paths : [absPath]
    window.api.startDragFile(dragPaths.length === 1 ? dragPaths[0] : dragPaths)
  }

  async function handleCopyImage(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!imgSrc) return
    try {
      const res = await fetch(imgSrc)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      toast('图片已复制到剪贴板', 'success')
    } catch { toast('复制失败，请使用"打开所在文件夹"', 'warning') }
    setShowMenu(false)
  }
  async function handleCopyPath(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!absPath) return
    await navigator.clipboard.writeText(absPath.replace(/\\/g, '/'))
    toast('路径已复制', 'success'); setShowMenu(false)
  }
  async function handleReveal(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!item.imagePath) return
    await window.api.revealInExplorer(projectDir, item.imagePath)
    setShowMenu(false)
  }

  const minH = thumbH ?? 80
  const hasBorder = dragOver || isDragTarget

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      {/* 缩略图容器 */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable={!!item.imagePath && !!absPath}
        onDragStart={handleDragStart}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={e => {
          // 阻止点击图片区域触发行选中
          e.stopPropagation()
          if (imgSrc && !showMenu) setShowPreview(true)
        }}
        style={{
          width: thumbW, height: minH, position: 'relative', overflow: 'hidden', flexShrink: 0,
          border: hasBorder ? '2px dashed var(--primary)' : imgSrc ? '1px solid var(--border)' : '2px dashed #cbd5e1',
          borderRadius: 'var(--radius)',
          background: hasBorder ? 'rgba(99,102,241,0.06)' : isSelected ? 'rgba(99,102,241,0.12)' : imgSrc ? 'transparent' : '#f8fafc',
          cursor: imgSrc ? 'pointer' : 'default',
          transition: 'border-color 0.15s, background 0.15s',
          userSelect: 'none',
          outline: isSelected ? '2px solid var(--primary)' : 'none',
          outlineOffset: -2
        }}
        title={imgSrc ? '点击预览（ESC 或点击背景关闭）' : '拖入图片（PNG/JPG/WEBP）'}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            style={{ width: '100%', height: '100%', objectFit: viewSettings.imageFit, display: 'block', pointerEvents: 'none' }}
            alt={item.imageFileName}
            loading="lazy"
          />
        ) : imgMissing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4, padding: 8 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontSize: 10, color: '#ef4444', textAlign: 'center' }}>图片文件丢失</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4, padding: 8 }}>
            <span style={{ fontSize: 22, opacity: 0.3 }}>🖼</span>
            <span style={{ fontSize: 10, color: 'var(--text-placeholder)', textAlign: 'center' }}>拖入图片</span>
          </div>
        )}

        {/* 勾选区 —— 左上角 36×36 大命中区域，内含可见的勾选框 */}
        {onToggleSelect && (imgSrc || imgMissing) && (
          <div
            onClick={e => { e.stopPropagation(); onToggleSelect(item.id) }}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 36, height: 36,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
              padding: 5,
              cursor: 'pointer',
              // 背景渐变：选中时保持可见，未选中悬停时显示
              background: isSelected
                ? 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, transparent 70%)'
                : hovered
                  ? 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, transparent 70%)'
                  : 'transparent',
              transition: 'background 0.15s',
              zIndex: 5
            }}
          >
            {/* 可见勾选框 */}
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: isSelected ? '2px solid white' : '2px solid rgba(255,255,255,0.85)',
              background: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'white', fontWeight: 700,
              opacity: isSelected || hovered ? 1 : 0,
              transition: 'opacity 0.15s, background 0.15s',
              flexShrink: 0
            }}>
              {isSelected ? '✓' : ''}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 —— stopPropagation 避免触发行选中 */}
      {(imgSrc || imgMissing) && (
        <div
          style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: thumbW }}
          onClick={e => e.stopPropagation()}
        >
          {/* 清除绑定 */}
          <button
            className="btn btn-sm btn-ghost"
            style={{ color: 'var(--danger)', fontSize: 11, padding: '2px 6px' }}
            onClick={() => { if (window.confirm('确认清除图片绑定？（不删除文件）')) onImageCleared(item.id) }}
          >
            ✕ 清除
          </button>

          {/* 复制图片到剪贴板（直接暴露，不放更多里） */}
          {imgSrc && (
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px' }}
              title="复制图片到剪贴板"
              onClick={handleCopyImage}
            >
              📋 复制
            </button>
          )}

          {/* 更多：打开文件夹 + 复制路径 */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px' }}
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
            >
              ⋯ 更多
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', bottom: '110%', left: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                zIndex: 50, minWidth: 160, padding: '4px 0'
              }}>
                {[
                  { icon: '📂', label: '打开所在文件夹', fn: handleReveal },
                  { icon: '🔗', label: '复制文件路径', fn: handleCopyPath }
                ].map(({ icon, label, fn }) => (
                  <button
                    key={label}
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '7px 12px', fontSize: 12 }}
                    onClick={fn}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPreview && imgSrc && (
        <ImagePreviewModal imageSrc={imgSrc} onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}
