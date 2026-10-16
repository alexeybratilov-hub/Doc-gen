@echo off
title Stop DocGen Portable
taskkill /f /im node.exe >nul 2>&1
powershell.exe -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle -like '*DocGen*' } | Stop-Process -Force" >nul 2>&1
