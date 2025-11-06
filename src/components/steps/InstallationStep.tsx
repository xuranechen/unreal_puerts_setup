import { useState, useEffect, useRef } from 'react'
import { Button, Card, Progress, Alert } from 'antd'
import {
  RightOutlined,
  LeftOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useSetupStore } from '../../store/useSetupStore'

interface SubTask {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  detail?: string
}

export default function InstallationStep() {
  const { setCurrentStep, logs, addLog, config, detection, setInstallProgress, installProgress } = useSetupStore()
  const [installing, setInstalling] = useState(false)
  const [paused, setPaused] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [cloneProgress, setCloneProgress] = useState('')
  const [clonePercent, setClonePercent] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloadInfo, setDownloadInfo] = useState<{
    speed?: string
    downloaded?: string
    total?: string
  }>({})
  const [currentTask, setCurrentTask] = useState('')
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 自动滚动到底部
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // 监听 Git clone 进度
    window.electronAPI.onGitCloneProgress((message: string) => {
      // Git 进度信息通常包含百分比或状态
      if (message.includes('Receiving objects') || message.includes('Resolving deltas') || message.includes('Counting objects') || message.includes('Compressing objects') || message.includes('Updating files') || message.includes('Checking out files')) {
        setCloneProgress(message)
        // 提取进度百分比
        const match = message.match(/(\d+)%/)
        if (match) {
          setClonePercent(parseInt(match[1]))
        }
      } else if (message.includes('Cloning into')) {
        setCloning(true)
        setCloneProgress('正在连接到远程仓库...')
      } else if (message.includes('remote:')) {
        // 显示远程消息但不更新百分比
        setCloneProgress(message)
      }
    })
    
    // 监听下载进度
    window.electronAPI.onDownloadProgress((data: any) => {
      // 支持新旧两种格式
      if (typeof data === 'number') {
        // 旧格式：只有百分比
        setDownloadPercent(data)
        if (data > 0 && data < 100) {
          setDownloading(true)
        } else if (data >= 100) {
          setDownloading(false)
          setDownloadInfo({})
        }
      } else if (typeof data === 'object') {
        // 新格式：包含详细信息
        const { progress, speed, downloaded, total } = data
        setDownloadPercent(progress || 0)
        
        if (progress > 0 && progress < 100) {
          setDownloading(true)
          setDownloadInfo({ speed, downloaded, total })
        } else if (progress >= 100) {
          setDownloading(false)
          setDownloadInfo({})
        }
      }
    })
  }, [])

  const updateSubTask = (index: number, updates: Partial<SubTask>) => {
    setSubTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }

  const startInstallation = async () => {
    setInstalling(true)
    setCompleted(false)
    addLog('info', '━━━━━━━━ 开始安装 ━━━━━━━━')
    
    // 初始化子任务列表
    const initialTasks: SubTask[] = [
      { name: '检查缺失工具', status: 'pending' },
      { name: 'PuerTS 插件', status: 'pending' },
      { name: 'V8 二进制包', status: 'pending' },
      { name: '配置项目文件', status: 'pending' },
      { name: 'TypeScript 依赖', status: 'pending' },
    ]
    setSubTasks(initialTasks)
    
    try {
      // 1. 安装缺失的工具
      setCurrentTask('检查缺失工具')
      updateSubTask(0, { status: 'running' })
      await installMissingTools()
      updateSubTask(0, { status: 'completed' })
      
      // 2. 下载 PuerTS 插件（先安装插件，建立目录结构）
      setCurrentTask('安装 PuerTS 插件')
      updateSubTask(1, { status: 'running' })
      await downloadPuerTSPlugin()
      updateSubTask(1, { status: 'completed' })
      
      // 3. 下载 V8 二进制包（如果使用 V8 引擎）
      setCurrentTask('处理 V8 二进制包')
      updateSubTask(2, { status: 'running' })
      await downloadV8Binary()
      updateSubTask(2, { status: 'completed' })
      
      // 4. 配置项目
      setCurrentTask('配置项目文件')
      updateSubTask(3, { status: 'running' })
      await configureProject()
      updateSubTask(3, { status: 'completed' })
      
      // 5. 安装 npm 依赖
      setCurrentTask('安装 TypeScript 依赖')
      updateSubTask(4, { status: 'running' })
      await installNpmDependencies()
      updateSubTask(4, { status: 'completed' })
      
      setCurrentTask('')
      setCompleted(true)
      setInstallProgress(100)
      addLog('success', '━━━━━━━━ 安装完成 ━━━━━━━━')
    } catch (error: any) {
      addLog('error', `安装失败: ${error.message}`)
      // 标记当前任务为失败
      const currentIndex = subTasks.findIndex(t => t.status === 'running')
      if (currentIndex !== -1) {
        updateSubTask(currentIndex, { status: 'failed', detail: error.message })
      }
    } finally {
      setInstalling(false)
    }
  }

  const installMissingTools = async () => {
    addLog('info', '检查缺失的工具...')
    setInstallProgress(10)
    
    let hasMissingTools = false
    
    // 检查 Node.js
    if (!detection?.nodejs.installed) {
      addLog('warning', '⚠️ 未检测到 Node.js')
      addLog('info', '请手动安装 Node.js: https://nodejs.org/')
      hasMissingTools = true
    } else {
      addLog('success', `✓ Node.js ${detection.nodejs.version}`)
    }
    
    // 检查 Git
    if (!detection?.git.installed) {
      addLog('warning', '⚠️ 未检测到 Git')
      addLog('info', '请手动安装 Git: https://git-scm.com/')
      hasMissingTools = true
    } else {
      addLog('success', `✓ Git ${detection.git.version}`)
    }
    
    setInstallProgress(25)
    
    if (hasMissingTools) {
      addLog('warning', '存在缺失工具，但可以继续配置')
    } else {
      addLog('success', '✓ 所有必需工具已安装')
    }
  }

  // 枚举值到版本号的映射
  const v8EnumToVersion: Record<string, string> = {
    'VDeprecated': '8.4.371.19',  // for UE 4.24 or below
    'V8_4_371_19': '8.4.371.19',
    'V9_4_146_24': '9.4.146.24',
    'V10_6_194': '10.6.194',
    'V11_8_172': '11.8.172',
  }
  
  // 版本号到枚举值的映射
  const versionToV8Enum: Record<string, string> = {
    '8.4.371.19': 'V8_4_371_19',
    '9.4.146.24': 'V9_4_146_24',
    '10.6.194': 'V10_6_194',
    '11.8.172': 'V11_8_172',
  }
  
  // 检测 PuerTS 插件期望的 V8 版本
  const detectExpectedV8Version = async (pluginsDir: string): Promise<string | null> => {
    addLog('info', '🔍 检测 PuerTS 插件期望的 V8 版本...')
    
    // 读取 JsEnv.Build.cs 文件
    const buildFilePath = `${pluginsDir}\\Source\\JsEnv\\JsEnv.Build.cs`
    const buildFileResult = await window.electronAPI.readText(buildFilePath)
    
    if (!buildFileResult.success || !buildFileResult.content) {
      addLog('warning', '⚠️ 无法读取 JsEnv.Build.cs，将使用默认版本顺序')
      return null
    }
    
    // 在构建文件中查找 V8 版本号
    const content = buildFileResult.content
    
    // 方法1: 从枚举格式的 UseV8Version 配置中读取（新版本）
    // 优先查找 UE_4_25_OR_LATER 分支内的版本（适用于 UE4.25+）
    const ue425Block = content.match(/#if\s+UE_4_25_OR_LATER([\s\S]*?)#else/i)
    if (ue425Block) {
      const blockContent = ue425Block[1]
      const enumMatch = blockContent.match(/SupportedV8Versions\.(V[\w]+)/i)
      if (enumMatch) {
        const enumValue = enumMatch[1]
        const version = v8EnumToVersion[enumValue]
        if (version) {
          addLog('success', `✓ 检测到 UseV8Version (UE 4.25+) = SupportedV8Versions.${enumValue} (版本: ${version})`)
          return version
        }
      }
    }
    
    // 如果没有条件编译，查找普通的枚举格式
    const enumMatch = content.match(/UseV8Version\s*=\s*[^.]*?SupportedV8Versions\.(V[^;\s]+)/i)
    if (enumMatch) {
      const enumValue = enumMatch[1]
      // 跳过 VDeprecated，因为它通常在 else 分支
      if (enumValue !== 'VDeprecated') {
        const version = v8EnumToVersion[enumValue]
        if (version) {
          addLog('success', `✓ 检测到 UseV8Version = SupportedV8Versions.${enumValue} (版本: ${version})`)
          return version
        }
      }
    }
    
    // 方法2: 从字符串格式读取（旧版本）
    const stringMatch = content.match(/UseV8Version\s*=\s*"([\d.]+)";/i)
    if (stringMatch) {
      const version = stringMatch[1]
      addLog('success', `✓ 从 UseV8Version 配置检测到版本: ${version}`)
      return version
    }
    
    // 方法3: 从路径中查找 v8_x.x.x 格式
    const v8PathMatch = content.match(/v8[_\\/](\d+\.\d+\.\d+(?:\.\d+)?)/i)
    if (v8PathMatch) {
      const version = v8PathMatch[1]
      addLog('success', `✓ 从路径中检测到 V8 版本: ${version}`)
      return version
    }
    
    addLog('warning', '⚠️ 未能从构建文件中检测到 V8 版本，将使用默认版本顺序')
    return null
  }
  
  const downloadV8Binary = async () => {
    if (config.scriptEngine !== 'v8') {
      addLog('info', '跳过 V8 二进制包安装（使用其他引擎）')
      updateSubTask(2, { detail: '不需要（使用其他引擎）', status: 'completed' })
      return
    }

    addLog('info', '开始处理 V8 二进制包...')
    setInstallProgress(50)

    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const pluginsDir = `${projectDir}\\Plugins\\Puerts`
    const v8TempDir = `${projectDir}\\Temp\\v8_temp`
    
    // 先解压到临时目录，稍后检测版本并移动到正确位置
    await window.electronAPI.ensureDir(v8TempDir)
    
    updateSubTask(2, { detail: `准备解压到临时目录` })

    if (config.v8BinarySource === 'auto') {
      // 自动下载
      addLog('info', '━━━━━━━━ 开始下载 V8 二进制包 ━━━━━━━━')
      
      // 检测插件期望的 V8 版本
      const expectedVersion = await detectExpectedV8Version(pluginsDir)
      
      // V8 二进制包下载地址列表（根据官方文档推荐版本）
      const v8Versions = [
        { version: '9.4.146.24', url: 'https://github.com/puerts/backend-v8/releases/download/V8_9.4.146.24_240430/v8_bin_9.4.146.24.tgz' },
        { version: '8.4.371.19', url: 'https://github.com/puerts/backend-v8/releases/download/V8_8.4.371.19_230911/v8_bin_8.4.371.19.tgz' },
        { version: '11.8.172', url: 'https://github.com/puerts/backend-v8/releases/download/V8_11.8.172_with_new_wrap_241205/v8_bin_11.8.172.tgz' },
        { version: '10.6.194', url: 'https://github.com/puerts/backend-v8/releases/download/V8_10.6.194_240612/v8_bin_10.6.194.tgz' }
      ]
      
      // 如果检测到期望版本，调整下载顺序
      let v8DownloadUrls: string[]
      if (expectedVersion) {
        const matchedVersion = v8Versions.find(v => v.version === expectedVersion)
        if (matchedVersion) {
          addLog('info', `📌 优先使用期望版本: ${expectedVersion}`)
          // 把匹配的版本放在第一位
          v8DownloadUrls = [
            matchedVersion.url,
            ...v8Versions.filter(v => v.version !== expectedVersion).map(v => v.url)
          ]
        } else {
          addLog('warning', `⚠️ 期望版本 ${expectedVersion} 不在可用列表中，使用默认顺序`)
          v8DownloadUrls = v8Versions.map(v => v.url)
        }
      } else {
        v8DownloadUrls = v8Versions.map(v => v.url)
      }
      
      const tgzPath = `${projectDir}\\Temp\\v8_bin.tgz`
      
      // 确保临时目录存在
      await window.electronAPI.ensureDir(`${projectDir}\\Temp`)
      
      addLog('info', `💾 临时文件: ${tgzPath}`)
      addLog('info', `📁 目标位置: ${pluginsDir}\\ThirdParty`)
      addLog('info', '⏱️ 超时设置: 连接超时 30秒，下载超时 5分钟')
      
      updateSubTask(2, { detail: `准备下载 → ${tgzPath}` })
      
      let downloadSuccess = false
      let lastError = ''
      
      // 尝试多个下载源
      for (let i = 0; i < v8DownloadUrls.length; i++) {
        const url = v8DownloadUrls[i]
        addLog('info', `📦 尝试下载源 ${i + 1}/${v8DownloadUrls.length}`)
        
        updateSubTask(2, { detail: `下载中 [${i + 1}/${v8DownloadUrls.length}] → ${tgzPath}` })
        
        const downloadResult = await window.electronAPI.downloadFile(url, tgzPath)
        
        if (downloadResult.success) {
          downloadSuccess = true
          addLog('success', `✓ 下载成功（使用源 ${i + 1}）`)
          break
        } else {
          lastError = downloadResult.error || '未知错误'
          addLog('warning', `✗ 下载失败: ${lastError}`)
          if (i < v8DownloadUrls.length - 1) {
            addLog('info', '⏳ 尝试下一个下载源...')
          }
        }
      }
      
      if (!downloadSuccess) {
        setDownloading(false)
        setDownloadPercent(0)
        setDownloadInfo({})
        addLog('error', '━━━━━━━━ 所有下载源均失败 ━━━━━━━━')
        addLog('error', `最后错误: ${lastError}`)
        addLog('warning', '💡 建议：请使用手动导入方式')
        addLog('info', '手动下载步骤：')
        addLog('info', '1. 访问 https://github.com/Tencent/puerts/releases')
        addLog('info', '2. 下载最新版本的 v8_bin_*.tgz 文件')
        addLog('info', '3. 返回配置页面，选择"手动导入"并选择下载的 tgz 文件')
        updateSubTask(2, { detail: '下载失败，请使用手动导入', status: 'failed' })
        throw new Error('V8 二进制包下载失败，请使用手动导入方式')
      }
      
      // 重置下载进度
      setDownloading(false)
      setDownloadPercent(0)
      setDownloadInfo({})
      
      addLog('success', '✓ V8 二进制包下载完成')
      addLog('info', `📦 正在解压到临时目录`)
      
      updateSubTask(2, { detail: `解压中 → ${v8TempDir}` })
      
      const extractResult = await window.electronAPI.extractTgz(tgzPath, v8TempDir)
      
      if (!extractResult.success) {
        addLog('error', `解压失败: ${extractResult.error}`)
        throw new Error(extractResult.error)
      }
      
      addLog('success', '✓ V8 二进制包解压完成')
      
      // 检测版本并移动到正确位置
      const installedVersion = await organizeV8Files(v8TempDir, pluginsDir)
      
      // 验证安装的版本是否与期望匹配
      if (expectedVersion && installedVersion && installedVersion !== expectedVersion) {
        addLog('warning', `⚠️ 警告: 安装的版本 ${installedVersion} 与期望版本 ${expectedVersion} 不匹配`)
        addLog('info', '💡 如果编译时出错，请尝试重新安装并选择正确的版本')
      } else if (installedVersion) {
        addLog('success', `✓ 版本验证通过: ${installedVersion}`)
      }
    } else {
      // 手动导入
      addLog('info', '━━━━━━━━ 手动导入 V8 二进制包 ━━━━━━━━')
      addLog('info', `📦 源位置: ${config.v8BinaryPath}`)
      
      // 检测插件期望的 V8 版本
      const expectedVersion = await detectExpectedV8Version(pluginsDir)
      
      updateSubTask(2, { detail: `导入中: ${config.v8BinaryPath}` })
      
      let installedVersion: string | null = null
      
      // 检查文件类型
      const filePath = config.v8BinaryPath.toLowerCase()
      if (filePath.endsWith('.tgz') || filePath.endsWith('.tar.gz')) {
        addLog('info', '⏳ 正在解压 tgz 文件...')
        const extractResult = await window.electronAPI.extractTgz(config.v8BinaryPath, v8TempDir)
        if (!extractResult.success) {
          addLog('error', `解压失败: ${extractResult.error}`)
          throw new Error(extractResult.error)
        }
        addLog('success', '✓ V8 二进制包解压完成')
        
        // 检测版本并移动到正确位置
        installedVersion = await organizeV8Files(v8TempDir, pluginsDir)
      } else if (filePath.endsWith('.zip')) {
        addLog('info', '⏳ 正在解压 zip 文件...')
        const extractResult = await window.electronAPI.extractZip(config.v8BinaryPath, v8TempDir)
        if (!extractResult.success) {
          addLog('error', `解压失败: ${extractResult.error}`)
          throw new Error(extractResult.error)
        }
        addLog('success', '✓ V8 二进制包解压完成')
        
        // 检测版本并移动到正确位置
        installedVersion = await organizeV8Files(v8TempDir, pluginsDir)
      } else {
        // 从目录拷贝 - 假设用户提供的是已经正确组织的 v8 目录
        addLog('info', '⏳ 正在拷贝文件...')
        
        // 检查是否是版本化的目录 (如 v8_10.6.194)
        const dirName = config.v8BinaryPath.split('\\').pop() || ''
        const versionMatch = dirName.match(/^v8_([\d.]+)$/)
        
        if (versionMatch) {
          installedVersion = versionMatch[1]
          // 直接拷贝到 ThirdParty 目录下
          const targetDir = `${pluginsDir}\\ThirdParty\\${dirName}`
          const copyResult = await window.electronAPI.copyDirectory(config.v8BinaryPath, targetDir)
          if (!copyResult.success) {
            addLog('error', `拷贝失败: ${copyResult.error}`)
            throw new Error(copyResult.error)
          }
          addLog('success', `✓ V8 二进制包拷贝完成`)
          addLog('info', `📁 安装位置: ${targetDir}`)
          updateSubTask(2, { detail: `已安装到: ${targetDir}` })
          
          // 更新 JsEnv.Build.cs 配置
          await updateJsEnvBuildConfig(pluginsDir, installedVersion)
        } else {
          // 拷贝到临时目录然后组织
          const copyResult = await window.electronAPI.copyDirectory(config.v8BinaryPath, v8TempDir)
          if (!copyResult.success) {
            addLog('error', `拷贝失败: ${copyResult.error}`)
            throw new Error(copyResult.error)
          }
          addLog('success', '✓ V8 二进制包拷贝完成')
          
          // 检测版本并移动到正确位置
          installedVersion = await organizeV8Files(v8TempDir, pluginsDir)
        }
      }
      
      // 验证安装的版本是否与期望匹配
      if (expectedVersion && installedVersion && installedVersion !== expectedVersion) {
        addLog('warning', `⚠️ 警告: 安装的版本 ${installedVersion} 与期望版本 ${expectedVersion} 不匹配`)
        addLog('info', '💡 如果编译时出错，请重新下载正确的 V8 版本：')
        addLog('info', `   需要版本: v8_${expectedVersion}`)
        addLog('info', `   下载地址: https://github.com/puerts/backend-v8/releases`)
      } else if (installedVersion) {
        addLog('success', `✓ 版本验证通过: ${installedVersion}`)
      }
    }

    setInstallProgress(40)
  }
  
  // 更新 JsEnv.Build.cs 中的 UseV8Version 设置
  const updateJsEnvBuildConfig = async (pluginsDir: string, v8Version: string) => {
    addLog('info', '📝 更新 JsEnv.Build.cs 配置文件...')
    
    const buildFilePath = `${pluginsDir}\\Source\\JsEnv\\JsEnv.Build.cs`
    const readResult = await window.electronAPI.readText(buildFilePath)
    
    if (!readResult.success || !readResult.content) {
      addLog('warning', '⚠️ 无法读取 JsEnv.Build.cs，跳过版本配置更新')
      return
    }
    
    let content = readResult.content
    let updated = false
    
    // 获取对应的枚举值
    const enumValue = versionToV8Enum[v8Version]
    
    if (enumValue) {
      // 方法1: 替换枚举格式 (新版本)
      // 先尝试替换 UE_4_25_OR_LATER 条件块内的版本
      const ue425BlockMatch = content.match(/#if\s+UE_4_25_OR_LATER([\s\S]*?)#else/i)
      if (ue425BlockMatch) {
        const blockContent = ue425BlockMatch[1]
        const hasEnum = /SupportedV8Versions\.(V[\w]+)/.test(blockContent)
        if (hasEnum) {
          // 只替换 #if UE_4_25_OR_LATER 块内的枚举值
          const newBlockContent = blockContent.replace(
            /SupportedV8Versions\.(V[\w]+)/,
            `SupportedV8Versions.${enumValue}`
          )
          content = content.replace(
            /#if\s+UE_4_25_OR_LATER[\s\S]*?#else/i,
            `#if UE_4_25_OR_LATER${newBlockContent}#else`
          )
          addLog('success', `✓ 找到条件编译格式配置，更新为: SupportedV8Versions.${enumValue}`)
          updated = true
        }
      }
      
      // 如果没有条件编译块，尝试替换普通枚举格式
      if (!updated) {
        const enumPattern = /(UseV8Version\s*=\s*(?:[^.]*?SupportedV8Versions\.))(V[\w]+)(;)/g
        
        if (enumPattern.test(content)) {
          content = content.replace(
            /(UseV8Version\s*=\s*(?:[^.]*?SupportedV8Versions\.))(V[\w]+)(;)/g,
            `$1${enumValue}$3`
          )
          addLog('success', `✓ 找到枚举格式配置，更新为: SupportedV8Versions.${enumValue}`)
          updated = true
        }
      }
    }
    
    if (!updated) {
      // 方法2: 替换字符串格式 (旧版本)
      const stringPattern = /(UseV8Version\s*=\s*")[\d.]+(";)/g
      
      if (stringPattern.test(content)) {
        content = content.replace(stringPattern, `$1${v8Version}$2`)
        addLog('success', `✓ 找到字符串格式配置，更新为: "${v8Version}"`)
        updated = true
      }
    }
    
    if (!updated) {
      const enumHint = enumValue ? `SupportedV8Versions.${enumValue}` : `"${v8Version}"`
      addLog('warning', '⚠️ 未找到 UseV8Version 配置项，可能需要手动设置')
      addLog('info', `💡 请在 JsEnv.Build.cs 中设置: UseV8Version = ${enumHint};`)
      return
    }
    
    // 写回文件
    const writeResult = await window.electronAPI.writeText(buildFilePath, content)
    
    if (writeResult.success) {
      const displayValue = enumValue ? `SupportedV8Versions.${enumValue}` : `"${v8Version}"`
      addLog('success', `✓ JsEnv.Build.cs 配置已更新，UseV8Version = ${displayValue}`)
    } else {
      addLog('error', `❌ 配置文件写入失败: ${writeResult.error}`)
      const enumHint = enumValue ? `SupportedV8Versions.${enumValue}` : `"${v8Version}"`
      addLog('info', `💡 请手动在 JsEnv.Build.cs 中设置: UseV8Version = ${enumHint};`)
    }
  }
  
  // 组织 V8 文件到正确的目录结构，返回安装的版本号
  const organizeV8Files = async (tempDir: string, pluginsDir: string): Promise<string | null> => {
    addLog('info', '🔍 检测 V8 版本目录结构...')
    
    // 使用 Windows dir 命令列出临时目录中的子目录
    const listResult = await window.electronAPI.executeCommand(`dir /b /ad "${tempDir}"`)
    
    if (!listResult.success || !listResult.stdout) {
      addLog('error', `无法读取临时目录: ${listResult.error || '命令执行失败'}`)
      throw new Error(listResult.error || '无法读取临时目录')
    }
    
    // 查找 v8_x.x.x 格式的目录
    const lines = listResult.stdout.split('\n').map(line => line.trim()).filter(line => line)
    const v8Dirs = lines.filter(dir => dir.match(/^v8_[\d.]+$/))
    
    if (v8Dirs.length === 0) {
      addLog('error', '❌ 未找到 v8_x.x.x 格式的版本目录')
      addLog('info', `临时目录内容: ${lines.join(', ')}`)
      throw new Error('V8 二进制包格式不正确，未找到版本目录')
    }
    
    const v8VersionDir = v8Dirs[0]
    // 从目录名中提取版本号 (去掉 v8_ 前缀)
    const versionNumber = v8VersionDir.replace(/^v8_/, '')
    addLog('success', `✓ 检测到 V8 版本: ${v8VersionDir}`)
    
    // 构建源路径和目标路径
    const sourceV8Dir = `${tempDir}\\${v8VersionDir}`
    const targetV8Dir = `${pluginsDir}\\ThirdParty\\${v8VersionDir}`
    
    addLog('info', `📁 源路径: ${sourceV8Dir}`)
    addLog('info', `📁 目标路径: ${targetV8Dir}`)
    
    // 如果目标目录已存在，先删除
    const targetExists = await window.electronAPI.directoryExists(targetV8Dir)
    if (targetExists.exists) {
      addLog('info', '⏳ 删除已存在的旧版本目录...')
      await window.electronAPI.executeCommand(`rmdir /s /q "${targetV8Dir}"`)
    }
    
    // 确保 ThirdParty 目录存在
    await window.electronAPI.ensureDir(`${pluginsDir}\\ThirdParty`)
    
    // 移动文件
    addLog('info', '⏳ 正在移动文件到目标位置...')
    updateSubTask(2, { detail: `移动文件 → ${targetV8Dir}` })
    
    const moveResult = await window.electronAPI.executeCommand(`xcopy "${sourceV8Dir}" "${targetV8Dir}" /E /I /H /Y`)
    
    if (!moveResult.success) {
      addLog('error', `文件移动失败: ${moveResult.error}`)
      throw new Error(moveResult.error || '文件移动失败')
    }
    
    addLog('success', `✓ V8 文件已安装到: ${targetV8Dir}`)
    updateSubTask(2, { detail: `已安装: ${v8VersionDir}` })
    
    // 清理临时目录
    addLog('info', '⏳ 清理临时文件...')
    await window.electronAPI.executeCommand(`rmdir /s /q "${tempDir}"`)
    addLog('success', '✓ 临时文件清理完成')
    
    // 更新 JsEnv.Build.cs 配置
    await updateJsEnvBuildConfig(pluginsDir, versionNumber)
    
    return versionNumber
  }

  const downloadPuerTSPlugin = async () => {
    addLog('info', '开始安装 PuerTS 插件...')
    setInstallProgress(25)
    
    // 获取项目 Plugins 目录
    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const pluginsDir = `${projectDir}\\Plugins\\Puerts`
    
    updateSubTask(1, { detail: `目标: ${pluginsDir}` })
    
    if (config.pluginSource === 'local') {
      // 从本地拷贝插件
      addLog('info', '━━━━━━━━ 从本地拷贝 PuerTS 插件 ━━━━━━━━')
      addLog('info', `📦 源位置: ${config.localPluginPath}`)
      addLog('info', `📁 目标位置: ${pluginsDir}`)
      
      // 如果目录存在，先删除（覆盖安装）
      const dirExists = await window.electronAPI.directoryExists(pluginsDir)
      if (dirExists.exists) {
        addLog('info', '⏳ 删除旧插件目录...')
        await window.electronAPI.executeCommand(`rmdir /s /q "${pluginsDir}"`)
      }
      
      addLog('info', '⏳ 正在拷贝文件，请稍候...')
      updateSubTask(1, { detail: `拷贝中: ${config.localPluginPath}` })
      
      const copyResult = await window.electronAPI.copyDirectory(config.localPluginPath, pluginsDir)
      
      if (copyResult.success) {
        addLog('success', '✓ 插件拷贝完成')
        updateSubTask(1, { detail: `已安装到: ${pluginsDir}` })
      } else {
        addLog('error', `插件拷贝失败: ${copyResult.error}`)
        throw new Error(copyResult.error)
      }
    } else {
      // 从 Git 仓库克隆
      const repoUrl = config.pluginSource === 'github' 
        ? 'https://github.com/Tencent/puerts.git'
        : 'https://gitee.com/mirrors/puerts.git'
      
      addLog('info', '━━━━━━━━ 开始克隆 PuerTS 插件 ━━━━━━━━')
      addLog('info', `📦 仓库地址: ${repoUrl}`)
      addLog('info', `📁 保存位置: ${pluginsDir}`)
      addLog('info', '🚀 使用 sparse-checkout 只克隆 Unreal 插件目录')
      
      // 使用临时目录克隆
      const tempCloneDir = `${projectDir}\\Temp\\puerts_clone`
      
      // 强制删除临时目录（如果存在）
      const tempDirExists = await window.electronAPI.directoryExists(tempCloneDir)
      if (tempDirExists.exists) {
        addLog('info', '⏳ 清理临时目录...')
        // 先移除只读属性，再强制删除（确保能删除 .git 目录）
        await window.electronAPI.executeCommand(`attrib -r -s -h "${tempCloneDir}\\*.*" /s /d`)
        await window.electronAPI.executeCommand(`rmdir /s /q "${tempCloneDir}"`)
        // 等待一小段时间确保删除完成
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // 二次确认删除
        const stillExists = await window.electronAPI.directoryExists(tempCloneDir)
        if (stillExists.exists) {
          addLog('warning', '临时目录删除不完整，尝试强制删除...')
          await window.electronAPI.executeCommand(`rd /s /q "${tempCloneDir}"`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      // 强制删除目标目录（如果存在）
      const dirExists = await window.electronAPI.directoryExists(pluginsDir)
      if (dirExists.exists) {
        addLog('info', '⏳ 删除旧插件目录...')
        // 先移除只读属性，再强制删除（确保能删除 .git 目录）
        await window.electronAPI.executeCommand(`attrib -r -s -h "${pluginsDir}\\*.*" /s /d`)
        await window.electronAPI.executeCommand(`rmdir /s /q "${pluginsDir}"`)
        // 等待一小段时间确保删除完成
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // 二次确认删除
        const stillExists2 = await window.electronAPI.directoryExists(pluginsDir)
        if (stillExists2.exists) {
          addLog('warning', '插件目录删除不完整，尝试强制删除...')
          await window.electronAPI.executeCommand(`rd /s /q "${pluginsDir}"`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      addLog('info', '⏳ 开始克隆 (sparse-checkout: unreal/Puerts)')
      updateSubTask(1, { detail: `克隆中: ${repoUrl}` })
      
      setCloning(true)
      setCloneProgress('正在连接到远程仓库...')
      setInstallProgress(35)
      
      // 使用 sparse-checkout 只克隆 unreal/Puerts 子目录
      const cloneResult = await window.electronAPI.clonePlugin(repoUrl, tempCloneDir, 'unreal/Puerts')
      
      // 重置克隆进度
      setCloning(false)
      setCloneProgress('')
      setClonePercent(0)
      
      if (cloneResult.success) {
        addLog('success', '✓ 插件克隆完成')
        
        // 移动 unreal/Puerts 的内容到目标目录
        addLog('info', '⏳ 正在整理文件结构...')
        const sourcePuertsDir = `${tempCloneDir}\\unreal\\Puerts`
        const moveResult = await window.electronAPI.executeCommand(`xcopy "${sourcePuertsDir}" "${pluginsDir}" /E /I /H /Y`)
        
        if (moveResult.success) {
          addLog('success', '✓ 文件结构整理完成')
          // 清理临时目录
          await window.electronAPI.executeCommand(`rmdir /s /q "${tempCloneDir}"`)
          updateSubTask(1, { detail: `已克隆到: ${pluginsDir}` })
        } else {
          addLog('error', `文件移动失败: ${moveResult.error}`)
          throw new Error(moveResult.error || '文件移动失败')
        }
      } else {
        addLog('error', `插件克隆失败: ${cloneResult.error}`)
        // 清理临时目录
        await window.electronAPI.executeCommand(`rmdir /s /q "${tempCloneDir}"`)
        throw new Error(cloneResult.error)
      }
    }
    
    setInstallProgress(45)
  }

  const configureProject = async () => {
    addLog('info', '配置项目文件...')
    setInstallProgress(70)
    
    // 读取 .uproject
    addLog('info', `读取项目文件: ${config.projectPath}`)
    const result = await window.electronAPI.readUProject(config.projectPath)
    
    if (result.success) {
      addLog('success', '项目文件读取成功')
      
      // 修改 .uproject 启用 PuerTS
      const projectData = result.content
      if (!projectData.Plugins) {
        projectData.Plugins = []
      }
      
      const puertsPlugin = projectData.Plugins.find((p: any) => p.Name === 'Puerts')
      if (!puertsPlugin) {
        projectData.Plugins.push({
          Name: 'Puerts',
          Enabled: true
        })
        addLog('info', '添加 PuerTS 插件到项目配置')
      } else {
        puertsPlugin.Enabled = true
        addLog('info', '启用 PuerTS 插件')
      }
      
      // 写回 .uproject
      const writeResult = await window.electronAPI.writeUProject(config.projectPath, projectData)
      if (writeResult.success) {
        addLog('success', '项目配置更新成功')
      } else {
        addLog('error', `项目配置更新失败: ${writeResult.error}`)
      }
    } else {
      addLog('error', `项目文件读取失败: ${result.error}`)
    }
    
    setInstallProgress(80)
  }

  const installNpmDependencies = async () => {
    addLog('info', '安装 TypeScript 依赖...')
    setInstallProgress(85)

    // Scripts/TypeScript 目录
    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const tsDir = `${projectDir}\\Scripts\\TypeScript`

    // 确保目录存在
    const ensureRes = await window.electronAPI.ensureDir(tsDir)
    if (!ensureRes.success) {
      addLog('error', `创建目录失败: ${tsDir}`)
      throw new Error('ensure dir failed')
    }

    // 写入 package.json（如不存在则创建/覆盖最小化内容）
    addLog('info', '写入 package.json')
    const pkg = {
      name: 'ue5-puerts-ts',
      private: true,
      version: '1.0.0',
      devDependencies: {
        typescript: '^5.3.3',
        'ts-node': '^10.9.2',
        '@types/node': '^20.10.5',
      },
      scripts: {
        build: 'tsc -p tsconfig.json',
        start: 'ts-node src/index.ts'
      }
    }
    await window.electronAPI.writeText(`${tsDir}\\package.json`, JSON.stringify(pkg, null, 2))

    // 写入 tsconfig.json（最小配置）
    addLog('info', '写入 tsconfig.json')
    const tsconfig = {
      compilerOptions: {
        target: 'ES2019',
        module: 'CommonJS',
        moduleResolution: 'Node',
        strict: true,
        esModuleInterop: true,
        outDir: 'dist',
        rootDir: 'src'
      },
      include: ['src']
    }
    await window.electronAPI.writeText(`${tsDir}\\tsconfig.json`, JSON.stringify(tsconfig, null, 2))

    // 确保 src 目录和示例文件
    await window.electronAPI.ensureDir(`${tsDir}\\src`)
    await window.electronAPI.writeText(`${tsDir}\\src\\index.ts`, 'console.log("Hello from TypeScript")\n')

    // 运行 npm install（在该目录下）
    addLog('info', '运行 npm install（首次会较慢）...')
    const installRes = await window.electronAPI.executeCommand('npm install --loglevel=error', { cwd: tsDir })
    if (!installRes.success) {
      addLog('error', `npm 安装失败: ${installRes.error}`)
      throw new Error(installRes.error || 'npm install failed')
    }

    setInstallProgress(98)
    addLog('success', 'npm 依赖安装完成')
    setInstallProgress(100)
  }

  const togglePause = () => {
    setPaused(!paused)
    addLog('warning', paused ? '继续安装' : '暂停安装')
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <Card className="glass-card border-none flex-1 overflow-auto flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
          <div className="text-center mb-3 flex-shrink-0">
            <h2 className="text-lg font-bold text-white mb-1">依赖安装</h2>
            <p className="text-dark-400 text-sm">
              安装 PuerTS 插件和依赖工具
            </p>
          </div>

          {/* 进度条 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-2 flex-shrink-0"
          >
            <Card className="glass-card border border-dark-700 p-3">
              <div className="flex items-center gap-3 mb-2">
                <DownloadOutlined className="text-3xl text-primary-500" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">
                      {completed ? '安装完成' : installing ? '安装中...' : '准备安装'}
                    </span>
                    <span className="text-primary-400 font-mono">{installProgress}%</span>
                  </div>
                  <Progress
                    percent={installProgress}
                    strokeColor={{
                      '0%': '#0ea5e9',
                      '100%': '#06b6d4',
                    }}
                    showInfo={false}
                    status={completed ? 'success' : 'active'}
                  />
                </div>
              </div>
              
              {/* 当前任务提示 */}
              {installing && currentTask && (
                <div className="mt-2 p-2 rounded bg-primary-500/10 border border-primary-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    <span className="text-primary-400 text-sm font-semibold">当前: {currentTask}</span>
                  </div>
                </div>
              )}

              {/* 子任务进度列表 */}
              {installing && subTasks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {subTasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-dark-800/50">
                      <div className="flex-shrink-0">
                        {task.status === 'pending' && (
                          <div className="w-4 h-4 rounded-full border-2 border-dark-600"></div>
                        )}
                        {task.status === 'running' && (
                          <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
                        )}
                        {task.status === 'completed' && (
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {task.status === 'failed' && (
                          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs truncate ${
                          task.status === 'running' ? 'text-primary-400 font-semibold' :
                          task.status === 'completed' ? 'text-green-400' :
                          task.status === 'failed' ? 'text-red-400' :
                          'text-dark-400'
                        }`}>
                          {task.name}
                        </div>
                        {task.detail && (
                          <div className="text-xs text-dark-500 truncate">{task.detail}</div>
                        )}
                      </div>
                      {task.progress !== undefined && (
                        <div className="text-xs text-primary-400 font-mono flex-shrink-0">{task.progress}%</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 下载进度条 */}
              {downloading && (
                <div className="mt-2 p-2 rounded bg-dark-800 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DownloadOutlined className="text-blue-400 text-xs animate-pulse" />
                      <span className="text-blue-400 text-xs font-semibold">
                        下载中: {downloadPercent}%
                      </span>
                    </div>
                    <div className="text-xs text-blue-300 font-mono">
                      {downloadInfo.speed && `${downloadInfo.speed} MB/s`}
                    </div>
                  </div>
                  {downloadInfo.downloaded && downloadInfo.total && (
                    <div className="text-xs text-dark-400 mb-1">
                      {downloadInfo.downloaded} MB / {downloadInfo.total} MB
                    </div>
                  )}
                  <Progress
                    percent={downloadPercent}
                    strokeColor={{
                      '0%': '#3b82f6',
                      '100%': '#06b6d4',
                    }}
                    size="small"
                    showInfo={false}
                    status="active"
                  />
                </div>
              )}

              {/* Git Clone 进度条 */}
              {cloning && (
                <div className="mt-2 p-2 rounded bg-dark-800 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudDownloadOutlined className="text-green-400 text-xs" />
                    <span className="text-green-400 text-xs font-semibold">{cloneProgress || 'Git Clone 进行中...'}</span>
                  </div>
                  <Progress
                    percent={clonePercent}
                    strokeColor={{
                      '0%': '#10b981',
                      '100%': '#06b6d4',
                    }}
                    size="small"
                    showInfo={false}
                    status="active"
                  />
                </div>
              )}
              
              {!installing && !completed && (
                <Alert
                  message="准备就绪"
                  description="点击「开始安装」按钮开始安装 PuerTS 和相关依赖"
                  type="info"
                  showIcon
                />
              )}
              
              {completed && (
                <Alert
                  message="安装成功"
                  description="所有依赖已成功安装，可以进入下一步"
                  type="success"
                  showIcon
                />
              )}
            </Card>
          </motion.div>

          {/* 日志区域 */}
          <Card 
            className="glass-card border border-dark-700 flex flex-col overflow-hidden"
            style={{ height: '200px' }}
            title={
              <div className="flex items-center justify-between">
                <span className="text-white text-xs">安装日志</span>
                <Button size="small" onClick={() => useSetupStore.getState().clearLogs()} className="text-xs h-6">
                  清空
                </Button>
              </div>
            }
            bodyStyle={{ padding: '8px', height: 'calc(100% - 45px)', overflow: 'hidden' }}
          >
            <div
              ref={logContainerRef}
              className="log-terminal h-full overflow-y-auto bg-dark-900 rounded p-2 font-mono text-xs"
            >
              {logs.length === 0 ? (
                <div className="text-dark-500 text-center py-4 text-xs">
                  暂无日志
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`log-line ${log.level} text-xs leading-relaxed`}>
                    <span className="text-dark-500">[{log.timestamp}]</span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </Card>

      {/* 底部按钮 */}
      <div className="flex justify-between flex-shrink-0">
        <Button
          onClick={() => setCurrentStep(1)}
          disabled={installing}
          icon={<LeftOutlined />}
        >
          上一步
        </Button>
        <div className="flex gap-2">
          {!completed && (
            <>
              {installing && (
                <Button
                  onClick={togglePause}
                  icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
                >
                  {paused ? '继续' : '暂停'}
                </Button>
              )}
              <Button
                type="primary"
                onClick={startInstallation}
                loading={installing}
                disabled={completed}
                icon={<DownloadOutlined />}
              >
                {installing ? '安装中...' : '开始安装'}
              </Button>
            </>
          )}
          {completed && (
            <Button
              type="primary"
              onClick={() => setCurrentStep(3)}
              icon={<RightOutlined />}
              iconPosition="end"
            >
              下一步
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

