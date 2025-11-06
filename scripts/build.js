const { build } = require('vite')
const { build: electronBuild } = require('electron-builder')
const fs = require('fs')
const path = require('path')

async function buildApp() {
  console.log('开始构建应用...\n')

  // 1. 构建前端
  console.log('📦 构建 React 前端...')
  await build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    mode: 'production'
  })
  console.log('✅ 前端构建完成\n')

  // 2. 构建 Electron 主进程
  console.log('⚡ 构建 Electron 主进程...')
  const { exec } = require('child_process')
  const { promisify } = require('util')
  const execAsync = promisify(exec)
  
  await execAsync('tsc -p tsconfig.node.json')
  console.log('✅ 主进程构建完成\n')

  console.log('✨ 所有构建完成！')
}

buildApp().catch(err => {
  console.error('构建失败:', err)
  process.exit(1)
})

