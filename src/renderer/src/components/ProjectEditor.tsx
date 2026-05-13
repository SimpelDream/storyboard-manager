import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { StoryItem, ViewSettings } from '../types/project'
import { DEFAULT_VIEW_SETTINGS } from '../types/project'
import type { ProjectStore } from '../store/projectStore'
import { createEmptyItem } from '../store/projectStore'
import Toolbar from './Toolbar'
import StoryRow from './StoryRow'
import ImportTextDialog from './ImportTextDialog'
import ThumbnailSettingsDialog from './ThumbnailSettingsDialog'
import ExportDialog from './ExportDialog'
import IntegrityStats from './IntegrityStats'
import InternalDropDialog from './InternalDropDialog'
import { useToast } from './Toast'

type StatusFilter = 'all' | 'missing' | 'usable' | 'needs_regen' | 'locked'
type ImportDialogMode = 'text' | 'prompt' | null

interface PendingDrop {
  srcId: string; tgtId: string; modifiers: { ctrl: boolean; shift: boolean }
}

interface Props { store: ProjectStore }

export default function ProjectEditor({ store }: Props) {
  const { state, saveNow, updateItem, moveUp, moveDown, deleteItemWithMerge,
    insertBefore, insertAfter, setItems, updateViewSettings, updateManifest } = store
  const { manifest, projectDir } = state
  const { toast } = useToast()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState<ImportDialogMode>(null)
  const [showThumbnail, setShowThumbnail] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

  // 多选图片（用于批量拖出）
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  // 各行 ImageCell 暴露的绝对路径缓存 (id -> absPath)
  const absPathCache = useRef<Map<string, string>>(new Map())

  // 列宽拖拽状态
  const draggingCol = useRef<'text' | 'prompt' | null>(null)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  const vs: ViewSettings = manifest ? {
    ...DEFAULT_VIEW_SETTINGS,
    ...manifest.viewSettings,
    visibleCols: { ...DEFAULT_VIEW_SETTINGS.visibleCols, ...manifest.viewSettings?.visibleCols }
  } : DEFAULT_VIEW_SETTINGS

  const colWidthText = vs.colWidthText ?? 360
  const colWidthPrompt = vs.colWidthPrompt ?? 360

  // 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNow().then(() => toast('已保存', 'success')) }
      if (e.key === 'Escape') { setShowImport(null); setShowThumbnail(false); setShowExport(false); setShowStats(false); setPendingDrop(null); setSelectedImageIds(new Set()) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveNow, toast])

  // 列宽拖拽
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingCol.current || !manifest) return
      const delta = e.clientX - dragStartX.current
      const newW = Math.max(120, dragStartW.current + delta)
      updateViewSettings(draggingCol.current === 'text' ? { colWidthText: newW } : { colWidthPrompt: newW })
    }
    const onUp = () => { draggingCol.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [manifest, updateViewSettings])

  if (!manifest || !projectDir) return null
  const items = manifest.items
  const filteredItems = items.filter(item => statusFilter === 'all' || item.status === statusFilter)

  function handleAddRow() { setItems([...items, createEmptyItem(items.length + 1)]) }
  function handleImageBound(id: string, path: string, fileName: string) { updateItem(id, { imagePath: path, imageFileName: fileName, status: 'usable' }) }
  function handleImageCleared(id: string) {
    updateItem(id, { imagePath: undefined, imageFileName: undefined, status: 'missing' })
    setSelectedImageIds(prev => { const s = new Set(prev); s.delete(id); return s })
    absPathCache.current.delete(id)
  }

  const handleToggleImageSelect = useCallback((id: string) => {
    setSelectedImageIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  /** 获取已选中图片的绝对路径，供 ImageCell 拖出使用 */
  const getSelectedAbsPaths = useCallback((): string[] => {
    if (selectedImageIds.size === 0) return []
    const paths: string[] = []
    selectedImageIds.forEach(id => {
      const p = absPathCache.current.get(id)
      if (p) paths.push(p)
    })
    return paths
  }, [selectedImageIds])

  /** 复制所有选中图片到剪贴板
   *  - 单张：复制图片像素内容（可直接粘贴到 PS、画图、聊天窗口）
   *  - 多张：写入 CF_HDROP 文件列表（可在 Windows 资源管理器 / 其它软件中粘贴为文件）
   */
  const handleCopySelectedImages = useCallback(async () => {
    const paths = getSelectedAbsPaths()
    if (paths.length === 0) return

    if (paths.length === 1) {
      try {
        const src = `file:///${paths[0].replace(/\\/g, '/')}`
        const res = await fetch(src)
        const blob = await res.blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        toast('已复制图片到剪贴板', 'success')
      } catch { toast('复制失败', 'error') }
    } else {
      // 多张：使用 CF_HDROP 写入系统文件剪贴板
      const result = await window.api.copyFilesToClipboard(paths)
      if (result.success) {
        toast(`已将 ${result.count} 张图片复制到剪贴板（可在资源管理器中粘贴）`, 'success')
      } else {
        toast(result.error ?? '复制失败', 'error')
      }
    }
  }, [getSelectedAbsPaths, toast])

  /** 由 ImageCell 回调，缓存绝对路径 */
  const handleAbsPathReady = useCallback((id: string, absPath: string | null) => {
    if (absPath) absPathCache.current.set(id, absPath)
    else absPathCache.current.delete(id)
  }, [])

  const handleInternalDrop = useCallback((targetId: string, modifiers: { ctrl: boolean; shift: boolean }) => {
    if (!dragSourceId || dragSourceId === targetId) { setDragSourceId(null); return }
    const src = items.find(i => i.id === dragSourceId)
    const tgt = items.find(i => i.id === targetId)
    if (!src?.imagePath) { setDragSourceId(null); return }
    if (modifiers.ctrl) {
      tgt?.imagePath ? setPendingDrop({ srcId: dragSourceId, tgtId: targetId, modifiers }) : applyDrop(dragSourceId, targetId, 'copy')
    } else if (modifiers.shift) {
      applyDrop(dragSourceId, targetId, 'swap')
    } else if (!tgt?.imagePath) {
      applyDrop(dragSourceId, targetId, 'move')
    } else {
      setPendingDrop({ srcId: dragSourceId, tgtId: targetId, modifiers })
    }
    setDragSourceId(null)
  }, [dragSourceId, items])

  type DropAction = 'move' | 'swap' | 'copy' | 'overwrite'
  function applyDrop(srcId: string, tgtId: string, action: DropAction) {
    const src = items.find(i => i.id === srcId)
    const tgt = items.find(i => i.id === tgtId)
    if (!src) return
    updateManifest(m => ({
      ...m,
      items: m.items.map(i => {
        if (action === 'move') {
          if (i.id === srcId) return { ...i, imagePath: undefined, imageFileName: undefined, status: 'missing' as const }
          if (i.id === tgtId) return { ...i, imagePath: src.imagePath, imageFileName: src.imageFileName, status: 'usable' as const }
        } else if (action === 'swap') {
          if (i.id === srcId) return { ...i, imagePath: tgt?.imagePath, imageFileName: tgt?.imageFileName, status: tgt?.imagePath ? 'usable' as const : 'missing' as const }
          if (i.id === tgtId) return { ...i, imagePath: src.imagePath, imageFileName: src.imageFileName, status: 'usable' as const }
        } else if (action === 'copy' || action === 'overwrite') {
          if (i.id === tgtId) return { ...i, imagePath: src.imagePath, imageFileName: src.imageFileName, status: 'usable' as const }
        }
        return i
      })
    }))
    toast(action === 'move' ? '已移动图片' : action === 'swap' ? '已交换图片' : '已复制图片绑定', 'success')
    setPendingDrop(null)
  }

  const ColDivider = ({ col }: { col: 'text' | 'prompt' }) => (
    <div
      onMouseDown={e => {
        e.preventDefault()
        draggingCol.current = col
        dragStartX.current = e.clientX
        dragStartW.current = col === 'text' ? colWidthText : colWidthPrompt
      }}
      style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: 'transparent', borderRight: '1px solid var(--border)', position: 'relative', zIndex: 5 }}
      title="拖动调整列宽"
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    />
  )

  const vis = vs.visibleCols

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toolbar
        projectName={manifest.projectName}
        isDirty={state.isDirty} isSaving={state.isSaving} lastSaveTime={state.lastSaveTime}
        items={items} viewSettings={vs}
        onUpdateView={updateViewSettings}
        onImportText={() => setShowImport('text')}
        onImportPrompt={() => setShowImport('prompt')}
        onExport={() => setShowExport(true)}
        onThumbnailSettings={() => setShowThumbnail(true)}
        onIntegrityStats={() => setShowStats(true)}
        onSave={() => saveNow().then(() => toast('已保存', 'success'))}
        onAddRow={handleAddRow}
        onCloseProject={store.closeProject}
      />

      {/* 多选提示条 */}
      {selectedImageIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--border)', flexShrink: 0, fontSize: 12, color: 'var(--primary)' }}>
          <span>已选中 {selectedImageIds.size} 张图片</span>
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>— 从任意图片拖动可批量拖出</span>
          <button
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11, padding: '2px 10px', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4 }}
            onClick={handleCopySelectedImages}
            title="复制选中图片到剪贴板（每次仅能复制 1 张）"
          >
            📋 复制图片
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '1px 8px' }} onClick={() => setSelectedImageIds(new Set())}>
            取消选择
          </button>
        </div>
      )}

      {/*
        单一滚动容器：overflowX 水平滚动放在外层，
        列头 (flexShrink: 0) + 行列表 (overflowY auto) 在同一水平滚动父容器内，
        避免出现双横向滚动条。
        垂直滚动条只在行列表出现，贴右边缘。
      */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 列头（不随纵向滚动，但随横向滚动） */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ width: 44, flexShrink: 0, padding: '6px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', borderRight: '1px solid var(--border)' }}>#</div>
          {vis.text && (<><div style={{ width: colWidthText, flexShrink: 0, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>故事片段</div><ColDivider col="text" /></>)}
          {vis.prompt && (<><div style={{ width: colWidthPrompt, flexShrink: 0, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>分镜提示词</div><ColDivider col="prompt" /></>)}
          {vis.image && <div style={{ flex: 1, minWidth: 200, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>图片 / 状态 / 备注</div>}
        </div>

        {/* 行列表（纵向滚动，横向 overflow visible 继承父容器水平滚动） */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
          {filteredItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 10, color: 'var(--text-placeholder)' }}>
              <span style={{ fontSize: 38 }}>📋</span>
              {items.length === 0
                ? <><p style={{ fontSize: 14 }}>项目暂无内容</p><p style={{ fontSize: 12 }}>点击"导入故事"或"导入提示词"开始，或点击"添加行"</p></>
                : <p style={{ fontSize: 14 }}>筛选无结果，请调整状态筛选</p>}
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <StoryRow
                key={item.id} item={item} projectDir={projectDir} viewSettings={vs}
                colWidthText={colWidthText} colWidthPrompt={colWidthPrompt}
                isFirst={idx === 0} isLast={idx === filteredItems.length - 1}
                isSelected={selectedItemId === item.id}
                isDragTarget={dragSourceId !== null && dragSourceId !== item.id}
                isImageSelected={selectedImageIds.has(item.id)}
                onSelect={setSelectedItemId}
                onUpdate={updateItem}
                onMoveUp={moveUp} onMoveDown={moveDown}
                onDelete={deleteItemWithMerge}
                onInsertBefore={insertBefore} onInsertAfter={insertAfter}
                onImageBound={handleImageBound} onImageCleared={handleImageCleared}
                onToggleImageSelect={handleToggleImageSelect}
                onAbsPathReady={handleAbsPathReady}
                getSelectedAbsPaths={getSelectedAbsPaths}
                onInternalDragStart={setDragSourceId} onInternalDrop={handleInternalDrop}
              />
            ))
          )}
          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* 状态筛选条 */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>状态筛选：</span>
        {(['all', 'missing', 'usable', 'needs_regen', 'locked'] as StatusFilter[]).map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? '全部' : s === 'missing' ? '未配图' : s === 'usable' ? '可用' : s === 'needs_regen' ? '需重绘' : '已锁定'}
          </button>
        ))}
      </div>

      {state.saveError && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 16px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', fontSize: 13, zIndex: 99 }}>
          ⚠ 保存失败：{state.saveError}
        </div>
      )}

      {showImport && <ImportTextDialog mode={showImport} existingItems={items} selectedItemId={selectedItemId} onConfirm={newItems => { setItems(newItems); setShowImport(null); toast('导入成功', 'success') }} onClose={() => setShowImport(null)} />}
      {showThumbnail && <ThumbnailSettingsDialog settings={vs} onSave={updateViewSettings} onClose={() => setShowThumbnail(false)} />}
      {showExport && <ExportDialog items={filteredItems} projectDir={projectDir} exportSettings={manifest.exportSettings} manifest={manifest} onClose={() => setShowExport(false)} />}
      {showStats && <IntegrityStats items={items} onClose={() => setShowStats(false)} />}
      {pendingDrop && (
        <InternalDropDialog
          srcItem={items.find(i => i.id === pendingDrop.srcId)!}
          tgtItem={items.find(i => i.id === pendingDrop.tgtId)!}
          isCtrl={pendingDrop.modifiers.ctrl}
          onSwap={() => applyDrop(pendingDrop.srcId, pendingDrop.tgtId, 'swap')}
          onOverwrite={() => applyDrop(pendingDrop.srcId, pendingDrop.tgtId, pendingDrop.modifiers.ctrl ? 'copy' : 'overwrite')}
          onCancel={() => { setPendingDrop(null); setDragSourceId(null) }}
        />
      )}
    </div>
  )
}
