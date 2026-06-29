@echo off
echo ===================================================
echo Iniciando Ambiente Local do Simulador de Portabilidade
echo ===================================================

echo [1/3] Iniciando o Backend (API na porta 8000)...
start "Backend - Portabilidade API" cmd /k "cd backend && ..\.venv\Scripts\uvicorn app.main:app --reload --port 8000"

echo [2/3] Iniciando o Frontend (Next.js na porta 3000)...
start "Frontend - Next.js" cmd /k "cd frontend && npm run dev"

echo [3/3] Aguardando o sistema carregar antes de abrir o navegador...
timeout /t 7 /nobreak

echo Abrindo o navegador...
start http://localhost:3000

echo Pronto! O ambiente local esta rodando.
