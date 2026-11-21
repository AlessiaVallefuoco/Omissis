@echo off
rem Omissis demo - Windows launcher. Double-click this file.
rem It serves the demo folder on this computer only and opens it in your browser.
cd /d "%~dp0"
title Omissis demo
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve-windows.ps1"
if errorlevel 1 (
  echo.
  echo If the browser did not open, double-click index.html instead ^(Edge or Chrome^).
  pause
)
