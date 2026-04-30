@echo off
echo ==========================================
echo       Iniciando CloudPOS...
echo ==========================================
echo.
echo 1. Iniciando el Servidor Backend...
start cmd.exe /k "cd backend && node index.js"

echo 2. Iniciando la Aplicacion Web...
start cmd.exe /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo   El sistema se abrira en tu navegador
echo   (http://localhost:5173) en unos segundos
echo ==========================================
timeout /t 3
start http://localhost:5173
exit
