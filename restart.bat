@echo off
chcp 65001 >nul
title GTMC 铁笼标签预扫描系统 - 服务启动

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend\server"
set "FRONTEND=%ROOT%web"

echo ============================================
echo  GTMC 铁笼标签预扫描系统 - 启动服务
echo ============================================
echo.
echo  项目目录: %ROOT%

:: 停掉所有占用端口的进程
echo.
echo [1/4] 清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo   端口已释放
timeout /t 2 /nobreak >nul

:: 启动后端
echo.
echo [2/4] 启动后端 API (端口 3000)...
cd /d "%BACKEND%"
start "GTMC-Backend" /MIN "%NODE%" dist\main.js
echo   后端启动中...
timeout /t 2 /nobreak >nul

:: 启动前端
echo.
echo [3/4] 启动 Web 前端 (端口 5173)...
cd /d "%FRONTEND%"
start "GTMC-Web" /MIN "%NODE%" node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173
echo   前端启动中...

:: 等待启动完成
echo.
echo [4/4] 等待服务就绪...
timeout /t 5 /nobreak >nul

:: 验证
echo.
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul && echo  [OK] 后端  http://localhost:3000 || echo  [FAIL] 后端启动失败!
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul && echo  [OK] 前端  http://localhost:5173 || echo  [FAIL] 前端启动失败!

echo.
echo ============================================
echo 按任意键打开 http://localhost:5173
pause >nul
start http://localhost:5173
