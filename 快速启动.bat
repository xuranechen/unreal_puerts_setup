@echo off
chcp 65001 >nul
echo ========================================
echo   UE5 + PuerTS 环境配置工具
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo [2/3] 安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [✓] 依赖已安装
)

:: 确保安装 Node 类型定义（避免 TS2688: Cannot find type definition file for 'node'）
echo [检查] 确认 @types/node 可用...
if not exist "node_modules\@types\node\package.json" (
    echo [修复] 缺少 @types/node，正在安装...
    call npm install -D @types/node
    if %errorlevel% neq 0 (
        echo [错误] 安装 @types/node 失败
        pause
        exit /b 1
    )
) else (
    echo [✓] @types/node 已就绪
)

echo [2/3] 编译 Electron...
call npx -p typescript tsc -p tsconfig.node.json
if %errorlevel% neq 0 (
    echo [错误] 编译失败
    pause
    exit /b 1
)

echo [3/3] 启动应用...
echo.
start /b cmd /c "npm run dev"
timeout /t 5 /nobreak >nul
set NODE_ENV=development
npx electron .

pause

