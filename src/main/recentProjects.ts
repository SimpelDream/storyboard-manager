import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** 最近项目记录结构 */
interface RecentProject {
  projectDir: string
  projectName: string
  openedAt: string
}

const RECENT_FILE = path.join(app.getPath('userData'), 'recent-projects.json')
const MAX_RECENT = 20

/** 读取最近项目列表 */
function loadRecent(): RecentProject[] {
  try {
    if (!fs.existsSync(RECENT_FILE)) return []
    const raw = fs.readFileSync(RECENT_FILE, 'utf-8')
    return JSON.parse(raw) as RecentProject[]
  } catch {
    return []
  }
}

/** 保存最近项目列表 */
function saveRecent(list: RecentProject[]): void {
  fs.writeFileSync(RECENT_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

/** 将项目添加/更新到最近列表 */
function addToRecent(projectDir: string, projectName: string): void {
  let list = loadRecent()
  // 移除同路径的旧记录
  list = list.filter((r) => r.projectDir !== projectDir)
  // 插入到最前面
  list.unshift({ projectDir, projectName, openedAt: new Date().toISOString() })
  // 截断到最大数量
  if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT)
  saveRecent(list)
}

/** 注册最近项目相关 IPC 处理器 */
export function registerRecentProjectsHandlers(): void {
  ipcMain.handle('recent:list', async () => {
    const list = loadRecent()
    // 过滤掉项目文件夹已不存在的记录
    const valid = list.filter((r) => {
      const manifestPath = path.join(r.projectDir, 'project.json')
      return fs.existsSync(manifestPath)
    })
    // 如果有失效项目，更新文件
    if (valid.length !== list.length) saveRecent(valid)
    return valid
  })

  ipcMain.handle('recent:add', async (_event, projectDir: string, projectName: string) => {
    addToRecent(projectDir, projectName)
    return { success: true }
  })

  ipcMain.handle('recent:remove', async (_event, projectDir: string) => {
    let list = loadRecent()
    list = list.filter((r) => r.projectDir !== projectDir)
    saveRecent(list)
    return { success: true }
  })
}
