@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "ROOT=%CD%"
set "BACKEND_DIR=%ROOT%\backend"
set "MYSQL_SERVICE=SUFE_MySQL84"
set "BACKEND_HEALTH=http://127.0.0.1:8080/actuator/health"
set "FRONTEND_URL=http://127.0.0.1:5174/"

echo.
echo ================================================
echo  上海财经大学 AI 赋能创业实践教学示范平台
echo  一键启动：MySQL + Java 后端 + React 前端
echo ================================================
echo.

sc.exe query "%MYSQL_SERVICE%" | findstr /C:"RUNNING" >nul 2>&1
if errorlevel 1 (
  echo [1/3] 正在启动 MySQL 服务 %MYSQL_SERVICE% ...
  net start "%MYSQL_SERVICE%" >nul 2>&1
  if errorlevel 1 (
    echo [失败] MySQL 服务无法启动，请右键使用管理员身份运行本文件。
    goto :failed
  )
) else (
  echo [1/3] MySQL 已运行。
)

call :url_ready "%BACKEND_HEALTH%"
if errorlevel 1 (
  echo [2/3] 正在构建并启动 Java 后端，首次启动可能需要一点时间 ...
  if not exist "%BACKEND_DIR%\.env.local" (
    echo [失败] 缺少 backend\.env.local，无法安全读取本地数据库配置。
    goto :failed
  )
  if not exist "%BACKEND_DIR%\mvnw.cmd" (
    echo [失败] 缺少 backend\mvnw.cmd。
    goto :failed
  )
  where java.exe >nul 2>&1
  if errorlevel 1 (
    echo [失败] 未找到 Java，请确认 Java 21 已安装并加入 PATH。
    goto :failed
  )
  pushd "%BACKEND_DIR%"
  call mvnw.cmd package -DskipTests
  if errorlevel 1 (
    popd
    echo [失败] Java 后端构建失败，请查看上方 Maven 输出。
    goto :failed
  )
  popd
  start "SUFE AI Backend 8080" powershell.exe -NoExit -ExecutionPolicy Bypass -File "%BACKEND_DIR%\start-mysql-local.ps1"
) else (
  echo [2/3] Java 后端已运行。
)

call :url_ready "%FRONTEND_URL%"
if errorlevel 1 (
  echo [3/3] 正在启动 React 前端（固定端口 5174） ...
  where npm.cmd >nul 2>&1
  if errorlevel 1 (
    echo [失败] 未找到 npm，请确认 Node.js 已安装并加入 PATH。
    goto :failed
  )
  if not exist "%ROOT%\node_modules" (
    echo [提示] 首次运行需要安装前端依赖 ...
    call npm.cmd install
    if errorlevel 1 (
      echo [失败] 前端依赖安装失败，请查看上方 npm 输出。
      goto :failed
    )
  )
  start "SUFE AI Frontend 5174" cmd.exe /k "cd /d ""%ROOT%"" && npm run dev -- --host 0.0.0.0 --port 5174 --strictPort"
) else (
  echo [3/3] React 前端已运行。
)

echo.
echo 正在等待服务就绪 ...
powershell.exe -NoProfile -Command "$deadline=(Get-Date).AddSeconds(45); do { try { $backend=(Invoke-WebRequest -UseBasicParsing -Uri '%BACKEND_HEALTH%' -TimeoutSec 2).StatusCode -eq 200 } catch { $backend=$false }; try { $frontend=(Invoke-WebRequest -UseBasicParsing -Uri '%FRONTEND_URL%' -TimeoutSec 2).StatusCode -eq 200 } catch { $frontend=$false }; if ($backend -and $frontend) { exit 0 }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo [提示] 服务仍在启动，请查看新打开的后端和前端窗口。
  goto :finish
)

echo [完成] 后端：http://127.0.0.1:8080/
echo [完成] 前端：http://localhost:5174/
if /I not "%SUFE_NO_BROWSER%"=="1" start "" "%FRONTEND_URL%"
goto :finish

:url_ready
powershell.exe -NoProfile -Command "try { $response=Invoke-WebRequest -UseBasicParsing -Uri '%~1' -TimeoutSec 3; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:failed
echo.
echo 启动未完成。问题修复后可再次双击本文件。

:finish
echo.
echo 可以保留后端和前端窗口运行；关闭对应窗口即可停止该服务。
if /I "%SUFE_NO_PAUSE%"=="1" goto :end
pause

:end
endlocal
