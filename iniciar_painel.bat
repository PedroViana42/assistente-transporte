@echo off
setlocal

set "PROJECT_DIR=%~dp0"
if exist "%PROJECT_DIR%app\streamlit_app.py" goto found_project

set "PROJECT_DIR=%USERPROFILE%\Documents\assistente-transporte\"
if exist "%PROJECT_DIR%app\streamlit_app.py" goto found_project

echo Nao encontrei a pasta do projeto.
echo Coloque este arquivo dentro da pasta assistente-transporte ou mantenha o projeto em:
echo %USERPROFILE%\Documents\assistente-transporte
pause
exit /b 1

:found_project
cd /d "%PROJECT_DIR%"

if not exist ".env" (
  echo Arquivo .env nao encontrado.
  echo Execute setup.bat e configure a DATABASE_URL do Neon antes de abrir o painel.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\activate.bat" (
  echo Ambiente virtual nao encontrado. Executando setup.bat...
  call setup.bat
  if errorlevel 1 (
    echo Falha ao configurar o ambiente.
    pause
    exit /b 1
  )
)

if exist ".venv\Scripts\python.exe" (
  .venv\Scripts\python.exe -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)" >nul 2>nul
  if errorlevel 1 (
    echo Ambiente virtual nao usa Python 3.12. Executando setup.bat para corrigir...
    call setup.bat
    if errorlevel 1 (
      echo Falha ao corrigir o ambiente.
      pause
      exit /b 1
    )
  )
)

call .venv\Scripts\activate.bat
if errorlevel 1 (
  echo Falha ao ativar o ambiente virtual.
  pause
  exit /b 1
)

python -c "import streamlit" >nul 2>nul
if errorlevel 1 (
  echo Dependencias incompletas. Instalando requirements.txt...
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

python -m alembic upgrade head
if errorlevel 1 (
  echo Falha ao aplicar migrations.
  pause
  exit /b 1
)

echo Abrindo Assistente de Transporte...
echo Se o navegador nao abrir sozinho, acesse: http://localhost:8501
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:8501'"
python -m streamlit run app/streamlit_app.py --server.port=8501 --server.headless=true
