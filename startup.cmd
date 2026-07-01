@echo off
chcp 65001 >nul
:: PM2 守护进程恢复脚本 - 用户登录时自动执行
cd /d "%~dp0"
npx pm2 resurrect 2>&1
echo GTMC services resurrected at %date% %time% >> "%~dp0pm2_startup.log"
