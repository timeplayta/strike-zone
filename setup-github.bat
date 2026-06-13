@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Strike Zone — GitHub + envio

set "GH=C:\Program Files\GitHub CLI\gh.exe"
set "GIT=C:\Program Files\Git\cmd\git.exe"

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado.
  pause
  exit /b 1
)

if not exist "%GH%" (
  echo ERRO: GitHub CLI nao encontrado.
  echo Instale com: winget install GitHub.cli
  pause
  exit /b 1
)

if not exist "%GIT%" (
  echo ERRO: Git nao encontrado.
  pause
  exit /b 1
)

echo.
echo === Strike Zone — configurar GitHub ===
echo.

"%GH%" auth status >nul 2>&1
if errorlevel 1 (
  echo Primeira vez: faca login no GitHub no navegador.
  echo Escolha: GitHub.com ^> HTTPS ^> Login com navegador
  echo.
  "%GH%" auth login -h github.com -p https -w
  if errorlevel 1 (
    echo Login falhou. Tente de novo.
    pause
    exit /b 1
  )
)

echo Verificando repositorio timeplayta/strike-zone ...
"%GH%" repo view timeplayta/strike-zone >nul 2>&1
if errorlevel 1 (
  echo Criando repositorio publico strike-zone ...
  "%GH%" repo create strike-zone --public --description "Strike Zone - FPS no navegador" --source=. --remote=origin --push
  if errorlevel 1 (
    echo.
    echo Se o repo ja existe, tentando apenas enviar o codigo ...
    "%GIT%" remote remove origin 2>nul
    "%GIT%" remote add origin https://github.com/timeplayta/strike-zone.git
    "%GIT%" branch -M main
    "%GIT%" push -u origin main
  )
) else (
  echo Repositorio ja existe. Enviando atualizacoes ...
  "%GIT%" remote remove origin 2>nul
  "%GIT%" remote add origin https://github.com/timeplayta/strike-zone.git
  "%GIT%" branch -M main
  "%GIT%" push -u origin main
)

if errorlevel 1 (
  echo.
  echo ERRO ao enviar. Verifique login e tente de novo.
  pause
  exit /b 1
)

echo.
echo === SUCESSO ===
echo Repositorio: https://github.com/timeplayta/strike-zone
echo.
echo Proximo passo no Render:
echo   1. render.com - New + - Blueprint
echo   2. Conecte timeplayta/strike-zone
echo   3. Plano Free - Apply
echo.
pause
