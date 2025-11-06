import { Steps } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  CodeOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useSetupStore } from './store/useSetupStore'
import DetectionStep from './components/steps/DetectionStep'
import ConfigurationStep from './components/steps/ConfigurationStep'
import InstallationStep from './components/steps/InstallationStep'
import GenerationStep from './components/steps/GenerationStep'
import CompletionStep from './components/steps/CompletionStep'

const steps = [
  {
    title: '环境检测',
    icon: <CheckCircleOutlined />,
  },
  {
    title: '项目配置',
    icon: <SettingOutlined />,
  },
  {
    title: '依赖安装',
    icon: <DownloadOutlined />,
  },
  {
    title: '代码生成',
    icon: <CodeOutlined />,
  },
  {
    title: '完成配置',
    icon: <RocketOutlined />,
  },
]

function App() {
  const { currentStep } = useSetupStore()

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <DetectionStep />
      case 1:
        return <ConfigurationStep />
      case 2:
        return <InstallationStep />
      case 3:
        return <GenerationStep />
      case 4:
        return <CompletionStep />
      default:
        return <DetectionStep />
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      {/* 头部 - 压缩版 */}
      <header className="glass-card mx-4 mt-4 px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <RocketOutlined className="text-lg text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                UE5 + PuerTS 环境配置工具
              </h1>
            </div>
          </div>
          <div className="text-right">
            <div className="text-dark-400 text-xs">v1.0.0</div>
          </div>
        </div>
      </header>

      {/* 步骤条 - 紧凑版 */}
      <div className="glass-card mx-4 mt-3 px-4 py-3">
        <Steps
          current={currentStep}
          items={steps}
          className="max-w-5xl mx-auto"
          size="small"
        />
      </div>

      {/* 内容区域 - 扩大空间 */}
      <div className="flex-1 overflow-hidden px-4 py-3 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App

