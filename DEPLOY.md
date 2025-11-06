# GitHub Actions 手动部署说明

## 概述

本项目已配置 GitHub Actions 手动构建和发布流程，可以通过 Web 界面手动触发构建 Electron 应用并发布到 GitHub Releases。

## 使用方法

### 手动触发构建和发布

1. **访问 GitHub Actions 页面**
   
   进入你的 GitHub 仓库，点击顶部的 "Actions" 标签

2. **选择工作流**
   
   在左侧选择 "Build and Release" 工作流

3. **运行工作流**
   
   - 点击右侧的 "Run workflow" 按钮
   - 选择要构建的分支（通常是 `main`）
   - 填写 **版本号**（如：`1.0.0`，不需要 `v` 前缀）
   - 填写 **发布说明**（可选，描述本次更新的内容）
   - 点击 "Run workflow" 确认

4. **等待构建完成**
   
   构建过程大约需要 5-10 分钟，完成后：
   - 会自动创建一个新的 Release（标签为 `v版本号`）
   - 安装包会自动上传到 Release 页面
   - 可以在 Releases 页面下载构建好的安装包

5. **验证发布**
   
   访问仓库的 Releases 页面，确认新版本已正确发布

### 使用示例

假设要发布 `1.0.1` 版本：

```
步骤 1: 访问 https://github.com/your-username/your-repo/actions
步骤 2: 点击左侧 "Build and Release"
步骤 3: 点击 "Run workflow" 按钮
步骤 4: 填写表单：
   - Use workflow from: main
   - 版本号: 1.0.1
   - 发布说明: 
     ## 更新内容
     - ✨ 新增自动检测功能
     - 🐛 修复配置路径问题
     - 📝 更新使用文档
步骤 5: 点击绿色的 "Run workflow" 按钮
步骤 6: 等待构建完成（刷新页面查看进度）
步骤 7: 访问 https://github.com/your-username/your-repo/releases 查看发布
```

构建完成后，会自动创建标签 `v1.0.1` 和对应的 Release。

## 工作流说明

### 触发条件

- **仅手动触发**：在 GitHub Actions 页面手动运行
- **输入参数**：
  - `version`: 版本号（必填，如 `1.0.0`）
  - `release_notes`: 发布说明（选填，默认为"新版本发布"）

### 构建平台

当前配置为仅构建 Windows 版本。如需支持其他平台，请修改 `.github/workflows/build.yml` 中的 `matrix.os` 配置：

```yaml
strategy:
  matrix:
    os: [windows-latest, macos-latest, ubuntu-latest]
```

### 构建步骤

1. ✅ 检出代码
2. ✅ 设置 Node.js 环境
3. ✅ 安装项目依赖
4. ✅ 构建前端应用
5. ✅ 打包 Electron 应用
6. ✅ 上传构建产物到 Artifacts
7. ✅ 创建 GitHub Release（仅标签触发时）

### 构建产物

构建完成后，可以在以下位置找到：

- **GitHub Actions Artifacts**：每次构建都会上传，保留 5 天
- **GitHub Releases**：仅在推送标签时创建，永久保存

## 配置要求

### 必需的配置

无需额外配置，GitHub 会自动提供 `GITHUB_TOKEN`，具有足够的权限创建 Release。

### 可选配置

如果需要发布到其他平台（如 Microsoft Store、Mac App Store），需要配置相应的证书和密钥：

1. 在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加密钥
2. 在工作流文件中引用这些密钥

## 发布清单

每次发布前，请确保：

- [ ] 更新 `package.json` 中的版本号（可选，但建议保持一致）
- [ ] 更新 `README.md` 中的更新日志（如果有）
- [ ] 测试应用在本地正常运行
- [ ] 提交并推送所有更改到 GitHub
- [ ] 在 GitHub Actions 页面手动触发构建
- [ ] 填写正确的版本号和发布说明
- [ ] 等待构建完成（约 5-10 分钟）
- [ ] 验证 Release 页面的构建产物

## 常见问题

### Q: 构建失败怎么办？

A: 访问 Actions 页面，查看具体的错误日志。常见原因包括：
- 依赖安装失败
- TypeScript 编译错误
- Electron Builder 配置问题

### Q: 如何修改 Release 说明？

A: 在手动触发工作流时，可以直接在 "发布说明" 输入框中填写更新内容，支持 Markdown 格式：

```markdown
## 更新内容
- ✨ 新功能 1
- ✨ 新功能 2
- 🐛 Bug 修复
- 📝 文档更新
```

### Q: 如何添加代码签名？

A: 对于 Windows 应用：

1. 获取代码签名证书
2. 在 GitHub Secrets 中添加证书信息
3. 在 `electron-builder.json` 中配置签名选项
4. 在工作流中添加签名步骤

## 本地构建

如果不想使用 GitHub Actions，也可以在本地构建：

```bash
# 安装依赖
npm install

# 构建并打包
npm run dist:win
```

构建产物将位于 `release` 目录中。

## 技术栈

- **CI/CD**: GitHub Actions
- **构建工具**: Electron Builder
- **Node.js**: v20
- **平台**: Windows (可扩展到 macOS, Linux)

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/cn/actions)
- [Electron Builder 文档](https://www.electron.build/)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)

