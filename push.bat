@echo off
title AYLOX IOS - Subir a GitHub
cd /d "%~dp0"
echo ========================================================
echo   AYLOX IOS - Subiendo codigo a GitHub...
echo ========================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo [EXITO] Tu proyecto fue subido correctamente a:
    echo https://github.com/luisdavidgarza385/AYLOX-ISO
) else (
    echo [AVISO] Si te pide inicio de sesion, autoriza la ventana de GitHub en tu navegador.
)
echo.
pause
