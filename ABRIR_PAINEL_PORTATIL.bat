@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%runtime\python\python.exe"

if not exist "%PYTHON_EXE%" (
  echo Runtime Python portatil nao encontrado.
  echo Este arquivo deve ficar junto da pasta runtime\python.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

if not exist ".env" (
  echo Arquivo .env nao encontrado.
  echo Configure a DATABASE_URL do Neon no arquivo .env antes de abrir o painel.
  pause
  exit /b 1
)

"%PYTHON_EXE%" -m alembic upgrade head
if errorlevel 1 (
  echo Falha ao aplicar migrations.
  pause
  exit /b 1
)

echo Abrindo Assistente de Transporte...
echo Se o navegador nao abrir sozinho, acesse: http://localhost:8501
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:8501'"
"%PYTHON_EXE%" -m streamlit run app/streamlit_app.py --server.port=8501 --server.headless=true
