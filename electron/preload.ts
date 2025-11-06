import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 对话框
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectUProject: () => ipcRenderer.invoke('dialog:selectUProject'),
  selectFile: (filters?: Array<{ name: string; extensions: string[] }>) => ipcRenderer.invoke('dialog:selectFile', filters),
  
  // 检测工具
  detectUE5Engine: () => ipcRenderer.invoke('detect:ue5Engine'),
  detectNodejs: () => ipcRenderer.invoke('detect:nodejs'),
  detectPython: () => ipcRenderer.invoke('detect:python'),
  detectGit: () => ipcRenderer.invoke('detect:git'),
  detectVSBuildTools: () => ipcRenderer.invoke('detect:vsbuildtools'),
  
  // 执行命令
  executeCommand: (command: string, options?: { cwd?: string }) => ipcRenderer.invoke('execute:command', command, options),
  
  // 文件操作
  readUProject: (filePath: string) => ipcRenderer.invoke('file:readUProject', filePath),
  readText: (filePath: string) => ipcRenderer.invoke('file:readText', filePath),
  writeUProject: (filePath: string, content: any) => ipcRenderer.invoke('file:writeUProject', filePath, content),
  writeText: (filePath: string, content: string) => ipcRenderer.invoke('file:writeText', filePath, content),
  ensureDir: (dirPath: string) => ipcRenderer.invoke('file:ensureDir', dirPath),
  copyDirectory: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('file:copyDirectory', sourcePath, targetPath),
  directoryExists: (dirPath: string) => ipcRenderer.invoke('file:directoryExists', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  
  // Git 操作
  clonePlugin: (repoUrl: string, targetPath: string, sparseCheckoutPath?: string) => ipcRenderer.invoke('git:clonePlugin', repoUrl, targetPath, sparseCheckoutPath),
  onGitCloneProgress: (callback: (message: string) => void) => {
    ipcRenderer.on('git:cloneProgress', (_, message) => callback(message))
  },
  
  // 下载和解压
  downloadFile: (url: string, targetPath: string) => ipcRenderer.invoke('download:file', url, targetPath),
  extractZip: (zipPath: string, targetDir: string) => ipcRenderer.invoke('file:extractZip', zipPath, targetDir),
  extractTgz: (tgzPath: string, targetDir: string) => ipcRenderer.invoke('file:extractTgz', tgzPath, targetDir),
  onDownloadProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('download:progress', (_, progress) => callback(progress))
  },
  
  // Shell 操作
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),
  openVSCode: (folderPath: string) => ipcRenderer.invoke('shell:openVSCode', folderPath),
  openUE5: (projectPath: string) => ipcRenderer.invoke('shell:openUE5', projectPath),
  openURL: (url: string) => ipcRenderer.invoke('shell:openURL', url),
})

// TypeScript 类型声明
export interface ElectronAPI {
  selectFolder: () => Promise<string | null>
  selectUProject: () => Promise<string | null>
  selectFile: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>
  detectUE5Engine: () => Promise<Array<{ id: string; path: string; version: string }>>
  detectNodejs: () => Promise<{ installed: boolean; version: string | null }>
  detectPython: () => Promise<{ installed: boolean; version: string | null }>
  detectGit: () => Promise<{ installed: boolean; version: string | null }>
  detectVSBuildTools: () => Promise<{ installed: boolean; version: string | null }>
  executeCommand: (command: string, options?: { cwd?: string }) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  readUProject: (filePath: string) => Promise<{ success: boolean; content?: any; error?: string }>
  readText: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeUProject: (filePath: string, content: any) => Promise<{ success: boolean; error?: string }>
  writeText: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  ensureDir: (dirPath: string) => Promise<{ success: boolean; error?: string }>
  copyDirectory: (sourcePath: string, targetPath: string) => Promise<{ success: boolean; error?: string }>
  directoryExists: (dirPath: string) => Promise<{ exists: boolean }>
  clonePlugin: (repoUrl: string, targetPath: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  onGitCloneProgress: (callback: (message: string) => void) => void
  downloadFile: (url: string, targetPath: string) => Promise<{ success: boolean; error?: string }>
  extractZip: (zipPath: string, targetDir: string) => Promise<{ success: boolean; error?: string }>
  onDownloadProgress: (callback: (progress: number) => void) => void
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  openVSCode: (folderPath: string) => Promise<{ success: boolean; warning?: string; error?: string }>
  openUE5: (projectPath: string) => Promise<{ success: boolean; error?: string }>
  openURL: (url: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

