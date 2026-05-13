import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectManifest, StoryItem } from '../types/project'
import { normalizeIndex } from '../utils/normalizeIndex'

export interface ProjectState {
  projectDir: string | null
  manifest: ProjectManifest | null
  isDirty: boolean
  isSaving: boolean
  lastSaveTime: string | null
  saveError: string | null
}

export function createEmptyItem(index: number): StoryItem {
  return { id: uuidv4(), index, text: '', prompt: '', status: 'missing', note: '' }
}

const AUTO_SAVE_DELAY = 1500

export function useProjectStore() {
  const [state, setState] = useState<ProjectState>({
    projectDir: null, manifest: null, isDirty: false,
    isSaving: false, lastSaveTime: null, saveError: null
  })

  const stateRef = useRef(state)
  stateRef.current = state
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSave = useCallback(async (dir: string, manifest: ProjectManifest) => {
    setState(s => ({ ...s, isSaving: true, saveError: null }))
    const result = await window.api.saveProject(dir, manifest)
    if (result.success) {
      setState(s => ({ ...s, isSaving: false, isDirty: false, lastSaveTime: result.updatedAt ?? new Date().toISOString() }))
    } else {
      setState(s => ({ ...s, isSaving: false, saveError: result.error ?? '保存失败' }))
    }
  }, [])

  const scheduleAutoSave = useCallback((dir: string, manifest: ProjectManifest) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(dir, manifest), AUTO_SAVE_DELAY)
  }, [doSave])

  const updateManifest = useCallback((updater: (prev: ProjectManifest) => ProjectManifest, autoSave = true) => {
    setState(s => {
      if (!s.manifest || !s.projectDir) return s
      const next = updater(s.manifest)
      if (autoSave) scheduleAutoSave(s.projectDir, next)
      return { ...s, manifest: next, isDirty: true }
    })
  }, [scheduleAutoSave])

  const openProject = useCallback((projectDir: string, manifest: ProjectManifest) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setState({ projectDir, manifest, isDirty: false, isSaving: false, lastSaveTime: manifest.updatedAt, saveError: null })
  }, [])

  const closeProject = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setState({ projectDir: null, manifest: null, isDirty: false, isSaving: false, lastSaveTime: null, saveError: null })
  }, [])

  const saveNow = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const { projectDir, manifest } = stateRef.current
    if (!projectDir || !manifest) return
    await doSave(projectDir, manifest)
  }, [doSave])

  const updateItem = useCallback((id: string, changes: Partial<StoryItem>) => {
    updateManifest(m => ({ ...m, items: m.items.map(i => i.id === id ? { ...i, ...changes } : i) }))
  }, [updateManifest])

  const moveUp = useCallback((id: string) => {
    updateManifest(m => {
      const idx = m.items.findIndex(i => i.id === id)
      if (idx <= 0) return m
      const items = [...m.items];
      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]
      return { ...m, items: normalizeIndex(items) }
    })
  }, [updateManifest])

  const moveDown = useCallback((id: string) => {
    updateManifest(m => {
      const idx = m.items.findIndex(i => i.id === id)
      if (idx < 0 || idx >= m.items.length - 1) return m
      const items = [...m.items];
      [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]
      return { ...m, items: normalizeIndex(items) }
    })
  }, [updateManifest])

  /** 普通删除（不合并） */
  const deleteItem = useCallback((id: string) => {
    updateManifest(m => ({ ...m, items: normalizeIndex(m.items.filter(i => i.id !== id)) }))
  }, [updateManifest])

  /**
   * 删除行（无弹窗），内容补位规则：
   * 各字段独立判断 — 若被删行该字段有内容，则合并到上一行（上一行为空则直接填入，有内容则换行拼接）
   * 图片：上一行无图时移过去，有图不动
   */
  const deleteItemWithMerge = useCallback((id: string) => {
    updateManifest(m => {
      const idx = m.items.findIndex(i => i.id === id)
      if (idx < 0) return m
      const cur = m.items[idx]
      const items = [...m.items]
      if (idx > 0) {
        const prev = { ...items[idx - 1] }
        if (cur.text.trim()) prev.text = prev.text.trim() ? prev.text + '\n' + cur.text : cur.text
        if (cur.prompt.trim()) prev.prompt = prev.prompt.trim() ? prev.prompt + '\n' + cur.prompt : cur.prompt
        if (cur.imagePath && !prev.imagePath) { prev.imagePath = cur.imagePath; prev.imageFileName = cur.imageFileName; prev.status = 'usable' }
        items[idx - 1] = prev
      }
      items.splice(idx, 1)
      return { ...m, items: normalizeIndex(items) }
    })
  }, [updateManifest])

  const insertBefore = useCallback((id: string) => {
    updateManifest(m => {
      const idx = m.items.findIndex(i => i.id === id)
      if (idx < 0) return m
      const items = [...m.items]
      items.splice(idx, 0, createEmptyItem(0))
      return { ...m, items: normalizeIndex(items) }
    })
  }, [updateManifest])

  const insertAfter = useCallback((id: string) => {
    updateManifest(m => {
      const idx = m.items.findIndex(i => i.id === id)
      if (idx < 0) return m
      const items = [...m.items]
      items.splice(idx + 1, 0, createEmptyItem(0))
      return { ...m, items: normalizeIndex(items) }
    })
  }, [updateManifest])

  const setItems = useCallback((items: StoryItem[]) => {
    updateManifest(m => ({ ...m, items: normalizeIndex(items) }))
  }, [updateManifest])

  const updateViewSettings = useCallback((settings: Partial<ProjectManifest['viewSettings']>) => {
    updateManifest(m => ({ ...m, viewSettings: { ...m.viewSettings, ...settings } }))
  }, [updateManifest])

  const updateExportSettings = useCallback((settings: Partial<ProjectManifest['exportSettings']>) => {
    updateManifest(m => ({ ...m, exportSettings: { ...m.exportSettings, ...settings } }))
  }, [updateManifest])

  return {
    state, openProject, closeProject, saveNow, updateManifest,
    updateItem, moveUp, moveDown, deleteItem, deleteItemWithMerge,
    insertBefore, insertAfter, setItems, updateViewSettings, updateExportSettings
  }
}

export type ProjectStore = ReturnType<typeof useProjectStore>
