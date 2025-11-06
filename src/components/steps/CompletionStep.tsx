import { Button, Card, Divider } from 'antd'
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  LeftOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useSetupStore } from '../../store/useSetupStore'

export default function CompletionStep() {
  const { setCurrentStep, config } = useSetupStore()

  const handleOpenFolder = async () => {
    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const result = await window.electronAPI.openFolder(projectDir)
    if (!result.success) {
      console.error('打开文件夹失败:', result.error)
    }
  }

  const handleOpenVSCode = async () => {
    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const tsDir = `${projectDir}\\Scripts\\TypeScript`
    const result = await window.electronAPI.openVSCode(tsDir)
    if (!result.success) {
      console.error('打开 VSCode 失败:', result.error)
    } else if (result.warning) {
      console.warn(result.warning)
    }
  }

  const handleOpenUE5 = async () => {
    const result = await window.electronAPI.openUE5(config.projectPath)
    if (!result.success) {
      console.error('启动 UE5 失败:', result.error)
    }
  }

  const handleOpenDocs = async () => {
    await window.electronAPI.openURL('https://github.com/Tencent/puerts/blob/master/doc/unreal/zhcn/readme.md')
  }

  const quickActions = [
    {
      title: '打开项目文件夹',
      description: '在文件资源管理器中打开项目',
      icon: <FolderOpenOutlined className="text-3xl" />,
      color: 'from-blue-500 to-blue-600',
      action: handleOpenFolder,
    },
    {
      title: '打开 VSCode',
      description: '在 VSCode 中打开项目开始编码',
      icon: <CodeOutlined className="text-3xl" />,
      color: 'from-purple-500 to-purple-600',
      action: handleOpenVSCode,
    },
    {
      title: '启动 UE5 编辑器',
      description: '打开 Unreal Engine 编辑器',
      icon: <PlayCircleOutlined className="text-3xl" />,
      color: 'from-green-500 to-green-600',
      action: handleOpenUE5,
    },
    {
      title: '查看文档',
      description: '阅读 PuerTS 开发文档',
      icon: <FileTextOutlined className="text-3xl" />,
      color: 'from-orange-500 to-orange-600',
      action: handleOpenDocs,
    },
  ]

  const nextSteps = [
    '在 VSCode 中打开项目，查看生成的示例代码',
    '启动 UE5 编辑器，确认 PuerTS 插件已正确加载',
    '运行示例场景，测试 TypeScript 脚本功能',
    '阅读文档，了解更多 PuerTS 开发技巧',
  ]

  return (
    <div className="h-full flex flex-col gap-3">
      <Card className="glass-card border-none flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* 成功图标 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="text-center mb-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 mb-3 shadow-2xl">
              <CheckCircleOutlined className="text-3xl text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">配置完成！</h2>
            <p className="text-dark-400 text-sm">
              UE5 + PuerTS 开发环境已配置完成
            </p>
          </motion.div>

          {/* 项目信息 */}
          <Card className="glass-card border border-dark-700 mb-3" bodyStyle={{ padding: '12px' }}>
            <h3 className="text-sm font-semibold text-white mb-2">项目信息</h3>
            <div className="space-y-2">
              <div className="p-2 rounded bg-dark-800">
                <div className="text-dark-400 text-xs mb-1">项目路径</div>
                <div className="text-white font-mono text-xs break-all">{config.projectPath || '未设置'}</div>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-dark-800">
                <span className="text-dark-400 text-xs">插件来源</span>
                <span className="text-white text-xs">
                  {config.pluginSource === 'github' && 'GitHub 官方'}
                  {config.pluginSource === 'gitee' && 'Gitee 镜像'}
                  {config.pluginSource === 'local' && '本地路径'}
                </span>
              </div>
            </div>
          </Card>

          {/* 快速操作 */}
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white mb-2">快速操作</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <Card
                    className="glass-card border border-dark-700 hover:border-primary-500 transition-all cursor-pointer group"
                    onClick={action.action}
                    bodyStyle={{ padding: '10px' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white text-sm font-semibold">{action.title}</h4>
                        <p className="text-dark-400 text-xs">{action.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 下一步建议 */}
          <Card className="glass-card border border-dark-700" bodyStyle={{ padding: '12px' }}>
            <h3 className="text-sm font-semibold text-white mb-2">接下来做什么？</h3>
            <div className="space-y-1.5">
              {nextSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-2 p-2 rounded bg-dark-800 border border-dark-700"
                >
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-dark-300 text-xs flex-1">{step}</p>
                </motion.div>
              ))}
            </div>
          </Card>

          <Divider className="border-dark-700" />

          {/* 感谢信息 */}
          <div className="text-center">
            <p className="text-dark-400 mb-2">
              感谢使用 UE5 + PuerTS 环境配置工具
            </p>
            <p className="text-dark-500 text-sm">
              如有问题，请访问{' '}
              <a
                href="https://github.com/Tencent/puerts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300"
              >
                PuerTS GitHub
              </a>
            </p>
          </div>
        </div>
      </Card>

      {/* 底部按钮 */}
      <div className="flex justify-between">
        <Button
          size="large"
          onClick={() => setCurrentStep(3)}
          icon={<LeftOutlined />}
        >
          上一步
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={() => setCurrentStep(0)}
        >
          重新配置
        </Button>
      </div>
    </div>
  )
}

