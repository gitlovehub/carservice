@echo off
title CarService Backend Server (Port 8000)
echo ========================================================
echo  CarService Backend (Laravel) - Dang khoi chay tren port 8000
echo ========================================================
cd /d "%~dp0backend"
"d:\APP_IT\laragon\bin\php\php.exe" artisan serve --port=8000
pause

