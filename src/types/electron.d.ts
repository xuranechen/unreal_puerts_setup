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
  fileExists: (filePath: string) => Promise<{ exists: boolean }>
  clonePlugin: (repoUrl: string, targetPath: string, sparseCheckoutPath?: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  onGitCloneProgress: (callback: (message: string) => void) => void
  downloadFile: (url: string, targetPath: string) => Promise<{ success: boolean; error?: string }>
  extractZip: (zipPath: string, targetDir: string) => Promise<{ success: boolean; error?: string }>
  extractTgz: (tgzPath: string, targetDir: string) => Promise<{ success: boolean; error?: string }>
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

export {}

