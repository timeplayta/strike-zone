@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Enviar Strike Zone ao GitHub

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao encontrado. Reinicie o PC apos instalar Git.
  pause
  exit /b 1
)

set /p GH_USER=Usuario GitHub (ex: mjuan): 
set /p GH_REPO=Nome do repositorio (ex: strike-zone): 

if "%GH_USER%"=="" exit /b 1
if "%GH_REPO%"=="" exit /b 1

git remote remove origin 2>nul
git remote add origin https://github.com/%GH_USER%/%GH_REPO%.git
git branch -M main
echo.
echo Enviando... Se pedir login, use sua conta GitHub no navegador.
echo.
git push -u origin main
echo.
pause
