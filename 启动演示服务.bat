@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo 正在启动上海财经大学商学院 AI 赋能创业实践教学示范平台 Demo...
echo.
echo 本机访问请打开：
echo   http://localhost:5174/
echo.
echo 如果需要让同一 Wi-Fi 下的其他电脑访问，请使用 Vite 输出里的 Network 地址。
echo 明天如果换网络，Network 地址可能会变，但 localhost 不会变。
echo.
npm run dev -- --host 0.0.0.0 --port 5174
pause
