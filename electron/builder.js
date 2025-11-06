const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

async function buildElectron() {
  console.log('编译 Electron TypeScript...')
  try {
    await execAsync('tsc -p tsconfig.node.json')
    console.log('✅ Electron 编译完成')
  } catch (error) {
    console.error('编译失败:', error)
    process.exit(1)
  }
}

buildElectron()

