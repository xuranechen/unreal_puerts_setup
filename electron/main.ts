import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import fs from 'fs'
import { pipeline } from 'stream/promises'

const execAsync = promisify(exec)

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f172a',
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // 开发环境加载 Vite 服务器，生产环境加载打包文件
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 打包后路径: app.asar/dist-electron/electron/main.js
    // 目标文件: app.asar/dist/index.html
    // 相对路径: ../../dist/index.html
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 辅助函数：判断是否显示 Git 进度信息
function shouldShowGitProgress(message: string): boolean {
  // 过滤掉空消息
  if (!message || message.length === 0) return false
  
  // 只显示包含以下关键词的消息
  const progressKeywords = [
    'Cloning into',           // 开始克隆
    'Receiving objects',      // 接收对象
    'Resolving deltas',       // 解析增量
    'Counting objects',       // 计数对象
    'Compressing objects',    // 压缩对象
    'remote:',                // 远程消息
    'Updating files',         // 更新文件
    'Checking out files',     // 检出文件
  ]
  
  // 检查是否包含进度关键词
  const hasKeyword = progressKeywords.some(keyword => message.includes(keyword))
  if (hasKeyword) return true
  
  // 过滤掉一些不需要的消息
  const excludePatterns = [
    /^warning:/i,                    // 警告信息
    /^hint:/i,                       // 提示信息
    /^fatal:/i,                      // 致命错误（会在失败时处理）
    /^error:/i,                      // 错误信息（会在失败时处理）
    /^\s*$/,                         // 空行
    /^Filtering content/i,           // 过滤内容
    /^Already on/i,                  // 已在分支
    /^Switched to/i,                 // 切换分支
    /^HEAD is now at/i,              // HEAD 位置
  ]
  
  for (const pattern of excludePatterns) {
    if (pattern.test(message)) return false
  }
  
  return false
}

// IPC 处理器

// 选择文件夹
ipcMain.handle('dialog:selectFolder', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  
  return result.canceled ? null : result.filePaths[0]
})

// 选择 .uproject 文件
ipcMain.handle('dialog:selectUProject', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Unreal Project', extensions: ['uproject'] }
    ],
  })
  
  return result.canceled ? null : result.filePaths[0]
})

// 选择文件（通用）
ipcMain.handle('dialog:selectFile', async (event, filters?: Array<{ name: string; extensions: string[] }>) => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [],
  })
  
  return result.canceled ? null : result.filePaths[0]
})

// 检测 UE5 引擎
ipcMain.handle('detect:ue5Engine', async () => {
  try {
    // Windows 注册表路径
    const regPath = 'HKEY_CURRENT_USER\\Software\\Epic Games\\Unreal Engine\\Builds'
    
    const { stdout } = await execAsync(`reg query "${regPath}"`)
    
    const lines = stdout.split('\n').filter(line => line.trim())
    const engines: Array<{ id: string; path: string; version: string }> = []
    
    for (const line of lines) {
      const match = line.match(/\s+([^\s]+)\s+REG_SZ\s+(.+)/)
      if (match) {
        const [, id, enginePath] = match
        const version = await detectEngineVersion(enginePath.trim())
        engines.push({ id, path: enginePath.trim(), version })
      }
    }
    
    return engines
  } catch (error) {
    console.error('检测 UE5 引擎失败:', error)
    return []
  }
})

// 检测引擎版本
async function detectEngineVersion(enginePath: string): Promise<string> {
  try {
    const versionFile = path.join(enginePath, 'Engine', 'Build', 'Build.version')
    const fs = require('fs').promises
    const content = await fs.readFile(versionFile, 'utf-8')
    const versionData = JSON.parse(content)
    return `${versionData.MajorVersion}.${versionData.MinorVersion}.${versionData.PatchVersion}`
  } catch {
    return 'Unknown'
  }
}

// 检测 Node.js
ipcMain.handle('detect:nodejs', async () => {
  try {
    const { stdout } = await execAsync('node --version')
    return { installed: true, version: stdout.trim().replace('v', '') }
  } catch {
    return { installed: false, version: null }
  }
})

// 检测 Python
ipcMain.handle('detect:python', async () => {
  try {
    const { stdout } = await execAsync('python --version')
    const version = stdout.trim().replace('Python ', '')
    return { installed: true, version }
  } catch {
    return { installed: false, version: null }
  }
})

// 检测 Git
ipcMain.handle('detect:git', async () => {
  try {
    const { stdout } = await execAsync('git --version')
    const version = stdout.trim().replace('git version ', '')
    return { installed: true, version }
  } catch {
    return { installed: false, version: null }
  }
})

// 检测 Visual Studio Build Tools
ipcMain.handle('detect:vsbuildtools', async () => {
  try {
    const vswherePath = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe'
    const { stdout } = await execAsync(`"${vswherePath}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationVersion`)
    return { installed: true, version: stdout.trim() }
  } catch {
    return { installed: false, version: null }
  }
})

// 执行命令（用于安装依赖等）
ipcMain.handle('execute:command', async (event, command: string, options?: { cwd?: string }) => {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd: options?.cwd })
    return { success: true, stdout, stderr }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 读取 .uproject 文件
ipcMain.handle('file:readUProject', async (event, filePath: string) => {
  try {
    const fs = require('fs').promises
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content: JSON.parse(content) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 读取文本文件
ipcMain.handle('file:readText', async (event, filePath: string) => {
  try {
    const fs = require('fs').promises
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 写入 .uproject 文件
ipcMain.handle('file:writeUProject', async (event, filePath: string, content: any) => {
  try {
    const fs = require('fs').promises
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 写入任意文本文件
ipcMain.handle('file:writeText', async (event, filePath: string, content: string) => {
  try {
    const fs = require('fs').promises
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 确保目录存在
ipcMain.handle('file:ensureDir', async (event, dirPath: string) => {
  try {
    const fs = require('fs').promises
    await fs.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Git clone 插件（带实时进度，支持 sparse-checkout）
ipcMain.handle('git:clonePlugin', async (event, repoUrl: string, targetPath: string, sparseCheckoutPath?: string) => {
  try {
    // 如果指定了 sparse-checkout 路径，使用稀疏检出
    if (sparseCheckoutPath) {
      return new Promise(async (resolve, reject) => {
        try {
          // 1. 克隆但不检出文件
          const cloneArgs = ['clone', '--filter=blob:none', '--no-checkout', '--progress', repoUrl, targetPath]
          const cloneProcess = spawn('git', cloneArgs)
          
          let errorOutput = ''
          let lastProgressMessage = ''
          
          cloneProcess.stderr?.on('data', (data) => {
            const message = data.toString()
            errorOutput += message
            
            // 过滤并只发送有用的进度信息
            const lines = message.split('\n').filter((line: string) => line.trim())
            for (const line of lines) {
              const trimmedLine = line.trim()
              // 只发送进度相关的信息，避免重复发送
              if (shouldShowGitProgress(trimmedLine) && trimmedLine !== lastProgressMessage) {
                lastProgressMessage = trimmedLine
                if (mainWindow) {
                  mainWindow.webContents.send('git:cloneProgress', trimmedLine)
                }
              }
            }
          })
          
          cloneProcess.on('close', async (code) => {
            if (code !== 0) {
              const errorMsg = errorOutput.trim() || '未知错误'
              reject(new Error(`Git clone 失败 (退出码 ${code}): ${errorMsg}`))
              return
            }
            
            try {
              // 2. 初始化 sparse-checkout
              const sparseInitProcess = spawn('git', ['sparse-checkout', 'init', '--cone'], { cwd: targetPath })
              await new Promise((res, rej) => {
                sparseInitProcess.on('close', (code) => code === 0 ? res(null) : rej(new Error('sparse-checkout init failed')))
              })
              
              // 3. 设置要检出的目录
              const sparseSetProcess = spawn('git', ['sparse-checkout', 'set', sparseCheckoutPath], { cwd: targetPath })
              await new Promise((res, rej) => {
                sparseSetProcess.on('close', (code) => code === 0 ? res(null) : rej(new Error('sparse-checkout set failed')))
              })
              
              // 4. 检出文件
              const checkoutProcess = spawn('git', ['checkout'], { cwd: targetPath })
              
              let checkoutLastProgress = ''
              checkoutProcess.stderr?.on('data', (data) => {
                const message = data.toString()
                const lines = message.split('\n').filter((line: string) => line.trim())
                for (const line of lines) {
                  const trimmedLine = line.trim()
                  if (shouldShowGitProgress(trimmedLine) && trimmedLine !== checkoutLastProgress) {
                    checkoutLastProgress = trimmedLine
                    if (mainWindow) {
                      mainWindow.webContents.send('git:cloneProgress', trimmedLine)
                    }
                  }
                }
              })
              
              checkoutProcess.on('close', (code) => {
                if (code === 0) {
                  resolve({ success: true })
                } else {
                  reject(new Error(`Git checkout 失败，退出码: ${code}`))
                }
              })
              
              checkoutProcess.on('error', (err) => reject(err))
            } catch (err) {
              reject(err)
            }
          })
          
          cloneProcess.on('error', (err) => reject(err))
        } catch (error) {
          reject(error)
        }
      })
    }
    
    // 普通 clone（完整仓库）
    return new Promise((resolve, reject) => {
      // 使用 spawn 执行 git clone，这样可以获取实时输出
      const gitProcess = spawn('git', ['clone', '--progress', repoUrl, targetPath])
      
      let output = ''
      let errorOutput = ''
      let lastProgressMessage = ''
      
      // Git 将进度信息输出到 stderr
      gitProcess.stderr?.on('data', (data) => {
        const message = data.toString()
        errorOutput += message
        
        // 过滤并只发送有用的进度信息
        const lines = message.split('\n').filter((line: string) => line.trim())
        for (const line of lines) {
          const trimmedLine = line.trim()
          // 只发送进度相关的信息，避免重复发送
          if (shouldShowGitProgress(trimmedLine) && trimmedLine !== lastProgressMessage) {
            lastProgressMessage = trimmedLine
            if (mainWindow) {
              mainWindow.webContents.send('git:cloneProgress', trimmedLine)
            }
          }
        }
      })
      
      gitProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })
      
      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout: output, stderr: errorOutput })
        } else {
          const errorMsg = errorOutput.trim() || '未知错误'
          reject(new Error(`Git clone 失败 (退出码 ${code}): ${errorMsg}`))
        }
      })
      
      gitProcess.on('error', (err) => {
        reject(err)
      })
    })
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 拷贝目录
ipcMain.handle('file:copyDirectory', async (event, sourcePath: string, targetPath: string) => {
  try {
    const fs = require('fs').promises
    const path = require('path')
    
    // 递归拷贝函数
    async function copyDir(src: string, dest: string) {
      await fs.mkdir(dest, { recursive: true })
      const entries = await fs.readdir(src, { withFileTypes: true })
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        
        if (entry.isDirectory()) {
          await copyDir(srcPath, destPath)
        } else {
          await fs.copyFile(srcPath, destPath)
        }
      }
    }
    
    await copyDir(sourcePath, targetPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 检查目录是否存在
ipcMain.handle('file:directoryExists', async (event, dirPath: string) => {
  try {
    const fs = require('fs').promises
    await fs.access(dirPath)
    return { exists: true }
  } catch {
    return { exists: false }
  }
})

// 检查文件是否存在
ipcMain.handle('file:exists', async (event, filePath: string) => {
  try {
    const fs = require('fs').promises
    await fs.access(filePath)
    return { exists: true }
  } catch {
    return { exists: false }
  }
})

// 下载文件的内部实现
async function downloadFileInternal(url: string, targetPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath)
    
    // 设置超时时间（5分钟）
    const DOWNLOAD_TIMEOUT = 5 * 60 * 1000
    const timeoutId = setTimeout(() => {
      file.close()
      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath)
        }
      } catch {}
      reject(new Error('下载超时（5分钟），请检查网络连接或尝试手动下载'))
    }, DOWNLOAD_TIMEOUT)
    
    const request = https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000  // 连接超时 30 秒
    }, async (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        clearTimeout(timeoutId)
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          try {
            fs.unlinkSync(targetPath)
          } catch {}
          
          // 递归下载重定向的 URL
          try {
            const result = await downloadFileInternal(redirectUrl, targetPath)
            resolve(result)
          } catch (err) {
            reject(err)
          }
          return
        }
      }

      const statusCode = response.statusCode || 0
      if (statusCode !== 200) {
        clearTimeout(timeoutId)
        file.close()
        try {
          fs.unlinkSync(targetPath)
        } catch {}
        
        let errorMsg = `HTTP ${statusCode}`
        if (statusCode === 404) {
          errorMsg += ' - 文件不存在，请检查下载地址是否正确'
        } else if (statusCode === 403) {
          errorMsg += ' - 访问被拒绝，可能需要身份验证'
        } else if (statusCode >= 500) {
          errorMsg += ' - 服务器错误，请稍后重试'
        }
        
        reject(new Error(`下载失败: ${errorMsg}`))
        return
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedSize = 0
      let lastUpdateTime = Date.now()
      let lastDownloadedSize = 0

      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        
        // 每 500ms 更新一次进度
        const now = Date.now()
        if (now - lastUpdateTime >= 500) {
          if (totalSize > 0 && mainWindow) {
            const progress = Math.round((downloadedSize / totalSize) * 100)
            const speed = ((downloadedSize - lastDownloadedSize) / (now - lastUpdateTime)) * 1000 // bytes/s
            const speedMB = (speed / 1024 / 1024).toFixed(2) // MB/s
            const totalMB = (totalSize / 1024 / 1024).toFixed(2)
            const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2)
            
            mainWindow.webContents.send('download:progress', {
              progress,
              speed: speedMB,
              downloaded: downloadedMB,
              total: totalMB
            })
          }
          
          lastUpdateTime = now
          lastDownloadedSize = downloadedSize
        }
      })

      response.pipe(file)

      file.on('finish', () => {
        clearTimeout(timeoutId)
        file.close()
        if (mainWindow) {
          mainWindow.webContents.send('download:progress', { progress: 100 })
        }
        resolve({ success: true })
      })

      file.on('error', (err) => {
        clearTimeout(timeoutId)
        try {
          fs.unlinkSync(targetPath)
        } catch {}
        reject(err)
      })
    })
    
    request.on('timeout', () => {
      clearTimeout(timeoutId)
      request.destroy()
      file.close()
      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath)
        }
      } catch {}
      reject(new Error('连接超时，请检查网络连接'))
    })
    
    request.on('error', (err) => {
      clearTimeout(timeoutId)
      file.close()
      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath)
        }
      } catch {}
      reject(err)
    })
  })
}

// 下载文件 IPC 处理器
ipcMain.handle('download:file', async (event, url: string, targetPath: string) => {
  try {
    return await downloadFileInternal(url, targetPath)
  } catch (error: any) {
    // 清理失败的临时文件
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
      }
    } catch {}
    return { success: false, error: error.message }
  }
})

// 解压 zip 文件
ipcMain.handle('file:extractZip', async (event, zipPath: string, targetDir: string) => {
  try {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(zipPath)
    
    // 确保目标目录存在
    const fsPromises = require('fs').promises
    await fsPromises.mkdir(targetDir, { recursive: true })
    
    // 解压
    zip.extractAllTo(targetDir, true)
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 解压 tgz 文件
ipcMain.handle('file:extractTgz', async (event, tgzPath: string, targetDir: string) => {
  try {
    const tar = require('tar')
    const fsPromises = require('fs').promises
    
    // 确保目标目录存在
    await fsPromises.mkdir(targetDir, { recursive: true })
    
    // 解压 tgz 文件
    await tar.x({
      file: tgzPath,
      cwd: targetDir,
      strip: 0 // 不剥离顶层目录
    })
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 打开文件夹
ipcMain.handle('shell:openFolder', async (event, folderPath: string) => {
  try {
    const { shell } = require('electron')
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 打开 VSCode
ipcMain.handle('shell:openVSCode', async (event, folderPath: string) => {
  try {
    // 尝试使用 code 命令打开 VSCode
    await execAsync(`code "${folderPath}"`)
    return { success: true }
  } catch (error: any) {
    // 如果 code 命令不可用，尝试直接打开
    try {
      const { shell } = require('electron')
      await shell.openPath(folderPath)
      return { success: true, warning: 'VSCode 命令不可用，已用默认程序打开文件夹' }
    } catch {
      return { success: false, error: error.message }
    }
  }
})

// 启动 UE5 项目
ipcMain.handle('shell:openUE5', async (event, projectPath: string) => {
  try {
    // 直接打开 .uproject 文件，Windows 会使用关联的 UE5 编辑器打开
    const { shell } = require('electron')
    await shell.openPath(projectPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 打开 URL
ipcMain.handle('shell:openURL', async (event, url: string) => {
  try {
    const { shell } = require('electron')
    await shell.openExternal(url)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

