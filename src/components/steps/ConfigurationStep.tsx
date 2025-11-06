import { useEffect } from 'react'
import { Button, Card, Input, Radio, Form, Space, Collapse } from 'antd'
import {
  FolderOutlined,
  FileOutlined,
  RightOutlined,
  LeftOutlined,
  GithubOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useSetupStore } from '../../store/useSetupStore'

export default function ConfigurationStep() {
  const { setCurrentStep, config, updateConfig, addLog } = useSetupStore()
  const [form] = Form.useForm()

  // 初始化表单值 - 只在组件挂载时同步一次
  useEffect(() => {
    form.setFieldsValue(config)
  }, []) // 空依赖数组，只在组件挂载时执行一次

  const handleSelectProject = async () => {
    const path = await window.electronAPI.selectUProject()
    if (path) {
      form.setFieldValue('projectPath', path)
      updateConfig({ projectPath: path })
      addLog('info', `选择项目: ${path}`)
    }
  }

  const handleSelectLocalPlugin = async () => {
    const path = await window.electronAPI.selectFolder()
    if (path) {
      form.setFieldValue('localPluginPath', path)
      updateConfig({ localPluginPath: path })
      addLog('info', `选择本地插件: ${path}`)
    }
  }

  const handleSelectV8Binary = async () => {
    // 支持选择 .tgz, .tar.gz, .zip 文件或文件夹
    const path = await window.electronAPI.selectFile([
      { name: 'V8 二进制包', extensions: ['tgz', 'tar.gz', 'gz', 'zip'] }
    ])
    if (path) {
      form.setFieldValue('v8BinaryPath', path)
      updateConfig({ v8BinaryPath: path })
      addLog('info', `选择 V8 二进制包: ${path}`)
    }
  }

  const handleNext = () => {
    form.validateFields().then(values => {
      updateConfig(values)
      addLog('success', '配置保存成功')
      setCurrentStep(2)
    })
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <Card className="glass-card border-none flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-white mb-1">项目配置</h2>
            <p className="text-dark-400 text-sm">
              配置 UE5 项目和 PuerTS 插件
            </p>
          </div>

          <Form
            form={form}
            layout="vertical"
            className="space-y-3"
            size="small"
          >
            {/* 项目路径 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card border border-dark-700">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <FileOutlined className="text-primary-500" />
                  UE5 项目路径
                </h3>
                <Form.Item
                  name="projectPath"
                  rules={[{ required: true, message: '请选择项目文件' }]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="large"
                      placeholder="选择 .uproject 文件"
                      value={config.projectPath}
                      readOnly
                      style={{ cursor: 'pointer' }}
                      onClick={handleSelectProject}
                    />
                    <Button
                      size="large"
                      icon={<FolderOutlined />}
                      onClick={handleSelectProject}
                    >
                      浏览
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <p className="text-dark-400 text-sm">
                  请选择您的 UE5 项目 .uproject 文件
                </p>
              </Card>
            </motion.div>

            {/* 插件来源 + 脚本引擎选择 并排 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {/* PuerTS 插件源 */}
              <Card className="glass-card border border-dark-700">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <CloudOutlined className="text-primary-500" />
                  PuerTS 插件来源
                </h3>
                <Form.Item name="pluginSource">
                  <Radio.Group className="w-full">
                    <Space direction="vertical" className="w-full" size="small">
                      <Radio value="github" className="w-full">
                        <div className="flex items-center gap-2">
                          <GithubOutlined />
                          <span className="text-sm">GitHub 官方</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          从 GitHub 下载最新版本
                        </div>
                      </Radio>
                      <Radio value="gitee" className="w-full">
                        <div className="flex items-center gap-2">
                          <CloudOutlined />
                          <span className="text-sm">Gitee 镜像</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          适合国内网络环境
                        </div>
                      </Radio>
                      <Radio value="local" className="w-full">
                        <div className="flex items-center gap-2">
                          <FolderOutlined />
                          <span className="text-sm">本地路径</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          使用已下载的插件
                        </div>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.pluginSource !== currentValues.pluginSource
                  }
                >
                  {({ getFieldValue }) =>
                    getFieldValue('pluginSource') === 'local' ? (
                      <Form.Item
                        name="localPluginPath"
                        rules={[{ required: true, message: '请选择本地插件路径' }]}
                      >
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            placeholder="选择 PuerTS 插件目录"
                            value={config.localPluginPath}
                            readOnly
                            style={{ cursor: 'pointer' }}
                            onClick={handleSelectLocalPlugin}
                          />
                          <Button
                            icon={<FolderOutlined />}
                            onClick={handleSelectLocalPlugin}
                          >
                            浏览
                          </Button>
                        </Space.Compact>
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Card>

              {/* 脚本引擎选择 */}
              <Card className="glass-card border border-dark-700">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <ThunderboltOutlined className="text-primary-500" />
                  脚本引擎选择
                </h3>
                <Form.Item name="scriptEngine">
                  <Radio.Group className="w-full">
                    <Space direction="vertical" className="w-full" size="small">
                      <Radio value="v8" className="w-full">
                        <div className="flex items-center gap-2">
                          <ApiOutlined />
                          <span className="text-sm">V8 引擎 (推荐)</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          性能最强，完整的 ES6+ 支持
                        </div>
                      </Radio>
                      <Radio value="quickjs" className="w-full">
                        <div className="flex items-center gap-2">
                          <ThunderboltOutlined />
                          <span className="text-sm">QuickJS 引擎</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          轻量级，适合嵌入式环境
                        </div>
                      </Radio>
                      <Radio value="nodejs" className="w-full">
                        <div className="flex items-center gap-2">
                          <CloudOutlined />
                          <span className="text-sm">Node.js 引擎</span>
                        </div>
                        <div className="text-dark-400 text-xs ml-6 mt-0.5">
                          使用系统 Node.js，npm 生态
                        </div>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Card>
            </motion.div>

            {/* V8 二进制包配置 - 独立显示 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.scriptEngine !== currentValues.scriptEngine
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('scriptEngine') === 'v8' ? (
                    <Card className="glass-card border border-dark-700">
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <ApiOutlined className="text-primary-500" />
                        V8 二进制包配置
                      </h3>
                      <Form.Item name="v8BinarySource">
                        <Radio.Group className="w-full">
                          <Space direction="vertical" className="w-full" size="small">
                            <Radio value="auto">
                              <span className="text-sm">自动下载</span>
                              <div className="text-dark-400 text-xs ml-6 mt-0.5">
                                从 GitHub 自动下载最新版本
                              </div>
                            </Radio>
                            <Radio value="manual">
                              <span className="text-sm">手动导入</span>
                              <div className="text-dark-400 text-xs ml-6 mt-0.5">
                                选择已下载的 V8 二进制包 (.tgz)
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) =>
                          prevValues.v8BinarySource !== currentValues.v8BinarySource
                        }
                      >
                        {({ getFieldValue }) =>
                          getFieldValue('v8BinarySource') === 'manual' ? (
                            <Form.Item
                              name="v8BinaryPath"
                              rules={[{ required: true, message: '请选择 V8 二进制包' }]}
                            >
                              <Space.Compact style={{ width: '100%' }}>
                                <Input
                                  placeholder="选择 V8 二进制包 (.tgz / .zip)"
                                  value={config.v8BinaryPath}
                                  readOnly
                                  style={{ cursor: 'pointer' }}
                                  onClick={handleSelectV8Binary}
                                />
                                <Button
                                  icon={<FolderOutlined />}
                                  onClick={handleSelectV8Binary}
                                >
                                  浏览
                                </Button>
                              </Space.Compact>
                            </Form.Item>
                          ) : null
                        }
                      </Form.Item>
                    </Card>
                  ) : null
                }
              </Form.Item>
            </motion.div>

            {/* 高级选项 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Collapse 
                ghost
                items={[
                  {
                    key: '1',
                    label: '高级选项',
                    children: (
                      <Card className="glass-card border border-dark-700">
                        <Form.Item name="useProxy" valuePropName="checked">
                          <Radio.Group>
                            <Space direction="vertical">
                              <Radio value={false}>不使用代理</Radio>
                              <Radio value={true}>使用代理</Radio>
                            </Space>
                          </Radio.Group>
                        </Form.Item>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) =>
                            prevValues.useProxy !== currentValues.useProxy
                          }
                        >
                          {({ getFieldValue }) =>
                            getFieldValue('useProxy') ? (
                              <Form.Item name="proxyUrl" label="代理地址">
                                <Input
                                  size="large"
                                  placeholder="http://127.0.0.1:7890"
                                />
                              </Form.Item>
                            ) : null
                          }
                        </Form.Item>
                      </Card>
                    ),
                  },
                ]}
              />
            </motion.div>
          </Form>
        </div>
      </Card>

      {/* 底部按钮 */}
      <div className="flex justify-between">
        <Button
          size="large"
          onClick={() => setCurrentStep(0)}
          icon={<LeftOutlined />}
        >
          上一步
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
          icon={<RightOutlined />}
          iconPosition="end"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}

