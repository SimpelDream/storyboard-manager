import React, { useEffect } from 'react'
import { useProjectStore } from './store/projectStore'
import type { ProjectManifest } from './types/project'
import StartPage from './components/StartPage'
import ProjectEditor from './components/ProjectEditor'
import { ToastProvider } from './components/Toast'

function AppInner() {
  const store = useProjectStore()
  const { state, openProject } = store

  /** 全局快捷键（Ctrl+N / Ctrl+O / Ctrl+S 在各子组件处理，这里只处理启动页快捷键） */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!state.manifest) return
      // Delete 键删除选中行（实现在 ProjectEditor 层处理）
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.manifest])

  function handleProjectOpen(projectDir: string, manifest: ProjectManifest) {
    openProject(projectDir, manifest)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {state.manifest === null ? (
        <StartPage onProjectOpen={handleProjectOpen} />
      ) : (
        <ProjectEditor store={store} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
