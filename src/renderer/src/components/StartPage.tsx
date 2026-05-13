import React, { useEffect, useState } from 'react'
import type { RecentProject, ProjectManifest } from '../types/project'
import { useToast } from './Toast'

interface Props {
  onProjectOpen: (projectDir: string, manifest: ProjectManifest) => void
}

export default function StartPage({ onProjectOpen }: Props) {
  const { toast } = useToast()
  const [recentList, setRecentList] = useState<RecentProject[]>([])
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDir, setNewDir] = useState('')
  const [creating, setCreating] = useState(false)

  /** 加载最近项目列表 */
  useEffect(() => {
    window.api.listRecentProjects().then(setRecentList)
  }, [])

  /** 选择新建项目的文件夹 */
  async function handleSelectDir() {
    const dir = await window.api.selectFolder()
    if (dir) setNewDir(dir)
  }

  /** 新建项目确认 */
  async function handleCreate() {
    if (!newName.trim()) { toast('请输入项目名称', 'warning'); return }
    if (!newDir.trim()) { toast('请选择项目文件夹', 'warning'); return }
    setCreating(true)
    const result = await window.api.createProject(newDir, newName.trim())
    setCreating(false)
    if (!result.success || !result.manifest) {
      toast(`创建失败: ${result.error}`, 'error')
      return
    }
    await window.api.addRecentProject(newDir, newName.trim())
    setShowNewDialog(false)
    setNewName('')
    setNewDir('')
    onProjectOpen(newDir, result.manifest)
  }

  /** 打开已有项目 */
  async function handleOpen() {
    const result = await window.api.openProject()
    if (result.canceled) return
    if (result.error) { toast(result.error, 'error'); return }
    if (!result.projectDir || !result.manifest) return
    await window.api.addRecentProject(result.projectDir, result.manifest.projectName)
    setRecentList(await window.api.listRecentProjects())
    onProjectOpen(result.projectDir, result.manifest)
  }

  /** 从最近列表打开项目 */
  async function handleOpenRecent(r: RecentProject) {
    const result = await window.api.loadProject(r.projectDir)
    if (!result.success || !result.manifest) {
      toast(result.error ?? '打开失败', 'error')
      return
    }
    await window.api.addRecentProject(r.projectDir, result.manifest.projectName)
    onProjectOpen(r.projectDir, result.manifest)
  }

  /** 从最近列表移除（不删除文件） */
  async function handleRemoveRecent(e: React.MouseEvent, dir: string) {
    e.stopPropagation()
    await window.api.removeRecentProject(dir)
    setRecentList(await window.api.listRecentProjects())
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎬</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>分镜管理器</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>管理故事片段 · 分镜提示词 · 图片匹配关系</p>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: 13, justifyContent: 'center' }}
            onClick={() => setShowNewDialog(true)}
          >
            ＋ 新建项目
          </button>
          <button
            className="btn"
            style={{ flex: 1, padding: '10px', fontSize: 13, justifyContent: 'center' }}
            onClick={handleOpen}
          >
            📂 打开项目
          </button>
        </div>

        {/* 最近项目列表 */}
        {recentList.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>最近打开</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentList.map((r) => (
                <div
                  key={r.projectDir}
                  onClick={() => handleOpenRecent(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    gap: 10,
                    transition: 'background 0.12s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  <span style={{ fontSize: 18 }}>📁</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.projectName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{r.projectDir}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(r.openedAt)}</span>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}
                    title="从列表移除"
                    onClick={(e) => handleRemoveRecent(e, r.projectDir)}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-placeholder)', fontSize: 12, padding: '16px 0' }}>
            暂无最近项目
          </div>
        )}
      </div>

      {/* 新建项目弹窗 */}
      {showNewDialog && (
        <div className="modal-overlay" onClick={() => setShowNewDialog(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              新建项目
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewDialog(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label>项目名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="输入项目名称，例如：璃月港故事"
                  style={{ marginTop: 6 }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label>项目文件夹</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    value={newDir}
                    readOnly
                    placeholder="选择存储文件夹..."
                    style={{ flex: 1 }}
                  />
                  <button className="btn" onClick={handleSelectDir}>浏览</button>
                </div>
                {newDir && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    将在此文件夹内创建 project.json、images/、exports/
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNewDialog(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
