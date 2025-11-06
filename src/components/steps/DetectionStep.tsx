import { useState, useEffect } from 'react'
import { Button, Card, Alert, Spin } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useSetupStore } from '../../store/useSetupStore'

interface ToolStatus {
  name: string
  icon: string
  installed: boolean | null
  version: string | null
  checking: boolean
}

export default function DetectionStep() {
  const { setCurrentStep, setDetection, addLog } = useSetupStore()
  const [tools, setTools] = useState<ToolStatus[]>([
    { name: 'Node.js', icon: '📦', installed: null, version: null, checking: true },
    { name: 'Git', icon: '📚', installed: null, version: null, checking: true },
  ])
  const [detecting, setDetecting] = useState(true)

  useEffect(() => {
    detectEnvironment()
  }, [])

  const detectEnvironment = async () => {
    addLog('info', '开始检测开发环境...')
    
    // 检测 Node.js
    const nodejs = await window.electronAPI.detectNodejs()
    updateToolStatus(0, nodejs.installed, nodejs.version, false)
    addLog(nodejs.installed ? 'success' : 'warning', 
      nodejs.installed ? `检测到 Node.js ${nodejs.version}` : 'Node.js 未安装')

    // 检测 Git
    const git = await window.electronAPI.detectGit()
    updateToolStatus(1, git.installed, git.version, false)
    addLog(git.installed ? 'success' : 'warning',
      git.installed ? `检测到 Git ${git.version}` : 'Git 未安装')

    // 保存检测结果
    setDetection({
      nodejs,
      git,
      python: { installed: false, version: null },  // 保留以兼容接口
      vsbuildtools: { installed: false, version: null },  // 保留以兼容接口
      ue5Engines: [],
    })

    setDetecting(false)
    addLog('success', '环境检测完成')
  }

  const updateToolStatus = (index: number, installed: boolean, version: string | null, checking: boolean) => {
    setTools(prev => {
      const newTools = [...prev]
      newTools[index] = { ...newTools[index], installed, version, checking }
      return newTools
    })
  }

  const canProceed = tools.every(tool => tool.installed === true)

  return (
    <div className="h-full flex flex-col gap-3">
      <Card className="glass-card border-none flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-white mb-1">环境检测</h2>
            <p className="text-dark-400 text-sm">
              检测开发环境工具
            </p>
          </div>

          {/* 工具检测状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card border border-dark-700 hover:border-primary-500 transition-all" bodyStyle={{ padding: '12px' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tool.icon}</span>
                      <div>
                        <div className="text-white text-sm font-semibold">{tool.name}</div>
                        {tool.version && (
                          <div className="text-dark-400 text-xs">v{tool.version}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      {tool.checking ? (
                        <Spin indicator={<LoadingOutlined spin />} size="small" />
                      ) : tool.installed ? (
                        <CheckCircleOutlined className="text-lg text-green-500" />
                      ) : (
                        <CloseCircleOutlined className="text-lg text-red-500" />
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* 提示信息 */}
          {!canProceed && !detecting && (
            <Alert
              message="部分工具未安装"
              description="某些必需工具未检测到。您可以继续配置，这些工具是可选的。"
              type="info"
              showIcon
              className="mb-6"
            />
          )}
          
          <Alert
            message="关于 UE5 引擎"
            description="本工具将通过您选择的 .uproject 文件自动关联引擎，无需手动指定引擎路径"
            type="info"
            showIcon
          />
        </div>
      </Card>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-4">
        <Button size="large" onClick={detectEnvironment} loading={detecting}>
          重新检测
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={() => setCurrentStep(1)}
          disabled={detecting}
          icon={<RightOutlined />}
          iconPosition="end"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}

