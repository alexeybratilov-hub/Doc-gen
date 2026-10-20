@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DocGen Desktop - Автономное приложение

echo ========================================================
echo       DocGen Desktop - Генератор документов
echo ========================================================
echo [OK] Запуск автономного десктопного приложения...
echo Приложение работает полностью локально на вашем ПК.
echo.

where msedge.exe >nul 2>&1
if %errorlevel% equ 0 (
    if exist "%~dp0dist\index.html" (
        start "" msedge.exe --app="file:///%~dp0dist\index.html"
        exit /b 0
    )
    if exist "%~dp0app\index.html" (
        start "" msedge.exe --app="file:///%~dp0app\index.html"
        exit /b 0
    )
    if exist "%~dp0index.html" (
        start "" msedge.exe --app="file:///%~dp0index.html"
        exit /b 0
    )
)

if exist "%~dp0dist\index.html" (
    start "" "%~dp0dist\index.html"
    exit /b 0
)
if exist "%~dp0app\index.html" (
    start "" "%~dp0app\index.html"
    exit /b 0
)
if exist "%~dp0index.html" (
    start "" "%~dp0index.html"
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %errorlevel% neq 0 (
    start http://localhost:3000
)
exit /b 0
