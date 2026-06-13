@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Strike Zone

if not exist "%~dp0game.js" (
  echo ERRO: game.js nao encontrado nesta pasta.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Instale Node.js em https://nodejs.org
  pause
  exit /b 1
)

echo Encerrando servidores antigos na porta 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo Iniciando Strike Zone...
echo NAO feche esta janela enquanto joga.
echo.
node server.js
pause
