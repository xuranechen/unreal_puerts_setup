import { useState } from 'react'
import { Button, Card, Checkbox, Alert } from 'antd'
import {
  RightOutlined,
  LeftOutlined,
  CodeOutlined,
  FileTextOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useSetupStore } from '../../store/useSetupStore'

interface GenerationTask {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

export default function GenerationStep() {
  const { setCurrentStep, addLog, config } = useSetupStore()
  const [generating, setGenerating] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [tasks, setTasks] = useState<GenerationTask[]>([
    {
      id: 'tsconfig',
      title: 'TypeScript 配置',
      description: '生成 tsconfig.json 和相关配置文件',
      icon: <FileTextOutlined />,
      enabled: true,
    },
    {
      id: 'declarations',
      title: 'UE5 类型声明',
      description: '生成 UE5 API 的 TypeScript 类型声明文件',
      icon: <CodeOutlined />,
      enabled: true,
    },
    {
      id: 'vscode',
      title: 'VSCode 配置',
      description: '生成 VSCode 调试配置和任务配置',
      icon: <SettingOutlined />,
      enabled: true,
    },
    {
      id: 'example',
      title: '示例代码',
      description: '生成基础示例代码和项目结构',
      icon: <ThunderboltOutlined />,
      enabled: true,
    },
  ])

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, enabled: !task.enabled } : task
      )
    )
  }

  const startGeneration = async () => {
    setGenerating(true)
    addLog('info', '━━━━━━━━ 开始生成代码 ━━━━━━━━')

    const projectDir = config.projectPath.substring(0, config.projectPath.lastIndexOf('\\'))
    const enabledTasks = tasks.filter(task => task.enabled)

    try {
      for (let i = 0; i < enabledTasks.length; i++) {
        const task = enabledTasks[i]
        addLog('info', `正在执行: ${task.title}`)

        switch (task.id) {
          case 'tsconfig':
            await generateTsConfig(projectDir)
            break
          case 'declarations':
            await generateDeclarations(projectDir)
            break
          case 'vscode':
            await generateVSCodeConfig(projectDir)
            break
          case 'example':
            await generateExampleCode(projectDir)
            break
        }

        addLog('success', `${task.title} 完成`)
      }

      setCompleted(true)
      addLog('success', '━━━━━━━━ 代码生成完成 ━━━━━━━━')
    } catch (error: any) {
      addLog('error', `生成失败: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const generateTsConfig = async (projectDir: string) => {
    const tsDir = `${projectDir}\\Scripts\\TypeScript`
    
    // tsconfig.json（如果不存在则创建）
    const tsconfig = {
      compilerOptions: {
        target: 'ES2019',
        module: 'CommonJS',
        moduleResolution: 'Node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        outDir: './dist',
        rootDir: './src',
        baseUrl: '.',
        paths: {
          'ue': ['./Typing/ue/index.d.ts'],
          'puerts': ['./Typing/puerts/index.d.ts']
        }
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    }
    
    await window.electronAPI.writeText(`${tsDir}\\tsconfig.json`, JSON.stringify(tsconfig, null, 2))
    addLog('success', '✓ 创建 tsconfig.json')
    
    // .prettierrc
    const prettierrc = {
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5'
    }
    
    await window.electronAPI.writeText(`${tsDir}\\.prettierrc`, JSON.stringify(prettierrc, null, 2))
    addLog('success', '✓ 创建 .prettierrc')
  }

  const generateDeclarations = async (projectDir: string) => {
    const typingDir = `${projectDir}\\Scripts\\TypeScript\\Typing`
    
    addLog('info', '  正在生成 UE5 API 类型声明...')
    
    // 创建 ue 类型声明目录
    await window.electronAPI.ensureDir(`${typingDir}\\ue`)
    
    // 生成基础 UE 类型声明（示例）
    const ueDeclaration = `// UE5 API Type Declarations
declare namespace UE {
  class Object {
    GetName(): string;
    IsValid(): boolean;
  }

  class Actor extends Object {
    GetActorLocation(): Vector;
    SetActorLocation(location: Vector): void;
    Destroy(): void;
  }

  class World extends Object {
    SpawnActor(actorClass: any, location: Vector, rotation: Rotator): Actor;
  }

  interface Vector {
    X: number;
    Y: number;
    Z: number;
  }

  interface Rotator {
    Pitch: number;
    Yaw: number;
    Roll: number;
  }
}

declare module 'ue' {
  export = UE;
}
`
    
    await window.electronAPI.writeText(`${typingDir}\\ue\\index.d.ts`, ueDeclaration)
    addLog('success', '✓ 生成 ue/index.d.ts')
    
    // 创建 puerts 类型声明目录
    await window.electronAPI.ensureDir(`${typingDir}\\puerts`)
    
    // 生成 PuerTS API 类型声明
    const puertsDeclaration = `// PuerTS API Type Declarations
declare namespace puerts {
  function $ref<T>(value: T): { value: T };
  function $unref<T>(ref: { value: T }): T;
  function $set<T>(ref: { value: T }, value: T): void;
  
  class TypedArrayConstructor {
    constructor(size: number);
    constructor(buffer: ArrayBuffer);
  }
}

declare module 'puerts' {
  export = puerts;
}
`
    
    await window.electronAPI.writeText(`${typingDir}\\puerts\\index.d.ts`, puertsDeclaration)
    addLog('success', '✓ 生成 puerts/index.d.ts')
    addLog('info', '  生成了基础类型定义')
  }

  const generateVSCodeConfig = async (projectDir: string) => {
    const vscodeDir = `${projectDir}\\Scripts\\TypeScript\\.vscode`
    
    await window.electronAPI.ensureDir(vscodeDir)
    
    // launch.json
    const launchJson = {
      version: '0.2.0',
      configurations: [
        {
          type: 'node',
          request: 'attach',
          name: 'Attach to UE5',
          port: 9229,
          skipFiles: ['<node_internals>/**']
        }
      ]
    }
    
    await window.electronAPI.writeText(`${vscodeDir}\\launch.json`, JSON.stringify(launchJson, null, 2))
    addLog('success', '✓ 创建 .vscode/launch.json')
    
    // tasks.json
    const tasksJson = {
      version: '2.0.0',
      tasks: [
        {
          label: 'Build TypeScript',
          type: 'npm',
          script: 'build',
          group: {
            kind: 'build',
            isDefault: true
          }
        }
      ]
    }
    
    await window.electronAPI.writeText(`${vscodeDir}\\tasks.json`, JSON.stringify(tasksJson, null, 2))
    addLog('success', '✓ 创建 .vscode/tasks.json')
    
    // settings.json
    const settingsJson = {
      'typescript.tsdk': 'node_modules/typescript/lib',
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll': true
      }
    }
    
    await window.electronAPI.writeText(`${vscodeDir}\\settings.json`, JSON.stringify(settingsJson, null, 2))
    addLog('success', '✓ 创建 .vscode/settings.json')
  }

  const generateExampleCode = async (projectDir: string) => {
    const srcDir = `${projectDir}\\Scripts\\TypeScript\\src`
    
    await window.electronAPI.ensureDir(srcDir)
    
    // HelloWorld.ts
    const helloWorld = `import * as UE from 'ue'

export class HelloWorld {
  public static Run(): void {
    console.log('Hello from PuerTS + TypeScript!')
    
    // 示例：获取世界对象
    const world = UE.World.GetWorld()
    if (world) {
      console.log('World is valid:', world.GetName())
    }
  }
}

// 自动执行
HelloWorld.Run()
`
    
    await window.electronAPI.writeText(`${srcDir}\\HelloWorld.ts`, helloWorld)
    addLog('success', '✓ 生成示例代码 HelloWorld.ts')
    
    // GameMode.ts
    const gameMode = `import * as UE from 'ue'

export class MyGameMode {
  private world: UE.World | null = null

  constructor() {
    this.world = UE.World.GetWorld()
    console.log('GameMode initialized')
  }

  public Tick(deltaTime: number): void {
    // 游戏逻辑更新
  }

  public SpawnActorAtLocation(location: UE.Vector): UE.Actor | null {
    if (!this.world) return null
    
    // 在指定位置生成 Actor
    return this.world.SpawnActor(null, location, { Pitch: 0, Yaw: 0, Roll: 0 })
  }
}
`
    
    await window.electronAPI.writeText(`${srcDir}\\GameMode.ts`, gameMode)
    addLog('success', '✓ 生成示例代码 GameMode.ts')
    
    // README.md
    const readme = `# UE5 + PuerTS TypeScript 项目

## 目录结构

\`\`\`
Scripts/TypeScript/
├── src/                  # TypeScript 源代码
│   ├── HelloWorld.ts    # 示例：Hello World
│   └── GameMode.ts      # 示例：游戏模式
├── Typing/              # 类型声明文件
│   ├── ue/             # UE5 API 类型
│   └── puerts/         # PuerTS API 类型
├── .vscode/            # VSCode 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # npm 配置
\`\`\`

## 开发流程

1. 在 \`src/\` 目录下编写 TypeScript 代码
2. 运行 \`npm run build\` 编译代码
3. 在 UE5 编辑器中加载并运行

## 调试

1. 在 UE5 中启用调试模式
2. 在 VSCode 中按 F5 启动调试
3. 设置断点进行调试

## 更多资源

- [PuerTS 文档](https://github.com/Tencent/puerts)
- [TypeScript 文档](https://www.typescriptlang.org/)
`
    
    await window.electronAPI.writeText(`${projectDir}\\Scripts\\TypeScript\\README.md`, readme)
    addLog('success', '✓ 生成 README.md')
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <Card className="glass-card border-none flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-white mb-1">代码生成</h2>
            <p className="text-dark-400 text-sm">
              生成 TypeScript 配置和开发环境
            </p>
          </div>

          {/* 任务选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`glass-card border transition-all cursor-pointer ${
                    task.enabled
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-dark-700'
                  }`}
                  onClick={() => !generating && toggleTask(task.id)}
                  bodyStyle={{ padding: '12px' }}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={task.enabled}
                      disabled={generating}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg text-primary-400">{task.icon}</span>
                        <h3 className="text-white text-sm font-semibold">{task.title}</h3>
                      </div>
                      <p className="text-dark-400 text-xs">{task.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* 提示信息 */}
          {!completed && !generating && (
            <Alert
              message="提示"
              description="选择需要生成的配置和代码，然后点击「开始生成」按钮"
              type="info"
              showIcon
              className="mb-6"
            />
          )}

          {completed && (
            <Alert
              message="生成完成"
              description="所有配置文件和代码已成功生成，您现在可以开始开发了！"
              type="success"
              showIcon
              className="mb-6"
            />
          )}

          {/* 生成内容预览 */}
          {tasks.some(t => t.enabled) && (
            <Card className="glass-card border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4">将要生成的文件</h3>
              <div className="space-y-3">
                {tasks
                  .filter(t => t.enabled)
                  .map(task => (
                    <div key={task.id} className="p-3 rounded bg-dark-800 border border-dark-700">
                      <div className="text-primary-400 font-medium mb-2">{task.title}</div>
                      <div className="text-dark-400 text-sm font-mono">
                        {task.id === 'tsconfig' && (
                          <>
                            • tsconfig.json<br />
                            • package.json<br />
                            • .prettierrc
                          </>
                        )}
                        {task.id === 'declarations' && (
                          <>
                            • Typing/ue/ue.d.ts<br />
                            • Typing/puerts/puerts.d.ts
                          </>
                        )}
                        {task.id === 'vscode' && (
                          <>
                            • .vscode/launch.json<br />
                            • .vscode/tasks.json<br />
                            • .vscode/settings.json
                          </>
                        )}
                        {task.id === 'example' && (
                          <>
                            • Scripts/TypeScript/HelloWorld.ts<br />
                            • Scripts/TypeScript/GameMode.ts<br />
                            • README.md
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* 底部按钮 */}
      <div className="flex justify-between">
        <Button
          size="large"
          onClick={() => setCurrentStep(2)}
          disabled={generating}
          icon={<LeftOutlined />}
        >
          上一步
        </Button>
        <div className="flex gap-3">
          {!completed && (
            <Button
              type="primary"
              size="large"
              onClick={startGeneration}
              loading={generating}
              disabled={!tasks.some(t => t.enabled)}
              icon={<CodeOutlined />}
            >
              {generating ? '生成中...' : '开始生成'}
            </Button>
          )}
          {completed && (
            <Button
              type="primary"
              size="large"
              onClick={() => setCurrentStep(4)}
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

