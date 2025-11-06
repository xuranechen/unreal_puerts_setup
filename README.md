# UE5 + PuerTS 环境配置工具

简化配置 Unreal Engine 5 与 PuerTS TypeScript 开发环境的可视化工具。

## 功能特性

✨ **可视化界面** - 现代化的 Electron 应用，操作简单直观

🔍 **智能检测** - 自动检测开发环境和 UE5 引擎安装

⚙️ **一键配置** - 自动配置 PuerTS 插件和 TypeScript 环境

📦 **依赖管理** - 自动安装必需的开发工具和依赖

🚀 **快速启动** - 生成 VSCode 调试配置，即开即用

## 系统要求

- Windows 10/11 (64位)
- Unreal Engine 5.x
- 磁盘空间: 至少 2GB

## 安装使用

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在另一个终端运行 Electron：

```bash
npm run electron:dev
```

### 打包发布

```bash
# 打包 Windows 版本
npm run dist

# 输出文件在 release/ 目录
```

### GitHub Actions 手动部署

本项目支持通过 GitHub Actions 手动构建和发布：

1. 提交代码到 GitHub
2. 访问仓库的 Actions 页面
3. 选择 "Build and Release" 工作流
4. 点击 "Run workflow"
5. 填写版本号和发布说明
6. 等待构建完成，自动发布到 Releases

详细说明请查看 [DEPLOY.md](./DEPLOY.md)。

## 项目结构

```
ue5-puerts-setup/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
├── src/               # React 渲染进程代码
│   ├── components/    # React 组件
│   ├── store/         # 状态管理
│   ├── App.tsx        # 主应用组件
│   └── main.tsx       # 入口文件
├── dist/              # 前端构建输出
├── dist-electron/     # Electron 构建输出
└── release/           # 最终打包输出
```

## 配置步骤

1. **环境检测** - 检测 Node.js、Python、Git、VS Build Tools 和 UE5 引擎
2. **项目配置** - 选择 UE5 项目和引擎路径，配置插件来源
3. **依赖安装** - 安装 PuerTS 插件和必需的开发工具
4. **代码生成** - 生成 TypeScript 配置和类型声明文件
5. **完成配置** - 提供快速操作入口，开始开发

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Ant Design** - 企业级 UI 组件库
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Framer Motion** - 动画库
- **Zustand** - 轻量级状态管理

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [PuerTS GitHub](https://github.com/Tencent/puerts)
- [Unreal Engine](https://www.unrealengine.com/)
- [TypeScript](https://www.typescriptlang.org/)



