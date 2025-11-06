import { create } from 'zustand'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface DetectionResult {
  nodejs: { installed: boolean; version: string | null }
  python: { installed: boolean; version: string | null }
  git: { installed: boolean; version: string | null }
  vsbuildtools: { installed: boolean; version: string | null }
  ue5Engines: Array<{ id: string; path: string; version: string }>
}

export interface SetupConfig {
  projectPath: string
  pluginSource: 'github' | 'gitee' | 'local'
  localPluginPath: string
  scriptEngine: 'v8' | 'quickjs' | 'nodejs'
  v8BinarySource: 'auto' | 'manual'
  v8BinaryPath: string
  useProxy: boolean
  proxyUrl: string
}

interface SetupState {
  // 当前步骤
  currentStep: number
  
  // 配置
  config: SetupConfig
  
  // 检测结果
  detection: DetectionResult | null
  
  // 日志
  logs: LogEntry[]
  
  // 安装状态
  isInstalling: boolean
  installProgress: number
  
  // 操作
  setCurrentStep: (step: number) => void
  updateConfig: (config: Partial<SetupConfig>) => void
  setDetection: (detection: DetectionResult) => void
  addLog: (level: LogEntry['level'], message: string) => void
  clearLogs: () => void
  setInstalling: (isInstalling: boolean) => void
  setInstallProgress: (progress: number) => void
}

export const useSetupStore = create<SetupState>((set) => ({
  currentStep: 0,
  
  config: {
    projectPath: '',
    pluginSource: 'github',
    localPluginPath: '',
    scriptEngine: 'v8',
    v8BinarySource: 'auto',
    v8BinaryPath: '',
    useProxy: false,
    proxyUrl: '',
  },
  
  detection: null,
  logs: [],
  isInstalling: false,
  installProgress: 0,
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  updateConfig: (newConfig) =>
    set((state) => ({
      config: { ...state.config, ...newConfig },
    })),
  
  setDetection: (detection) => set({ detection }),
  
  addLog: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          level,
          message,
        },
      ],
    })),
  
  clearLogs: () => set({ logs: [] }),
  
  setInstalling: (isInstalling) => set({ isInstalling }),
  
  setInstallProgress: (progress) => set({ installProgress: progress }),
}))

