@echo off
chcp 65001 >nul
echo ========================================
echo   打包 UE5 + PuerTS 环境配置工具
echo ========================================
echo.

echo [1/3] 清理旧文件...
if exist "dist" rmdir /s /q dist
if exist "dist-electron" rmdir /s /q dist-electron
if exist "release" rmdir /s /q release
echo.

echo [2/3] 构建应用...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo.

echo [3/3] 打包应用（这可能需要几分钟）...
call npx electron-builder --win --config electron-builder.json
if %errorlevel% neq 0 (
    echo [错误] 打包失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出目录: release\
dir release\*.exe
echo.
pause

