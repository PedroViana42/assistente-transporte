@echo off
setlocal

if not exist .venv\Scripts\activate.bat (
  echo Ambiente virtual nao encontrado. Execute setup.bat primeiro.
  exit /b 1
)

call .venv\Scripts\activate.bat
python -m app.cli resumo
