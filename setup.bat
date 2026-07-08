@echo off
setlocal
cd /d "%~dp0"

py -3.12 --version >nul 2>nul
if errorlevel 1 (
  echo Python 3.12 nao encontrado. Instale o Python 3.12 e tente novamente.
  goto fail
)

py -3.12 --version

if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)" >nul 2>nul
  if errorlevel 1 (
    echo Ambiente virtual existente nao usa Python 3.12.
    echo Recriando .venv com Python 3.12...
    rmdir /s /q .venv
  )
)

if not exist .venv (
  py -3.12 -m venv .venv
  if errorlevel 1 goto fail
)

call .venv\Scripts\activate.bat
if errorlevel 1 goto fail

python -m pip install --upgrade pip
if errorlevel 1 goto fail

pip install -r requirements.txt
if errorlevel 1 goto fail

if not exist data\entrada mkdir data\entrada
if not exist data\processados mkdir data\processados
if not exist data\erros mkdir data\erros
if not exist data\exportacoes mkdir data\exportacoes
if not exist data\backups mkdir data\backups

if not exist .env (
  copy .env.example .env >nul
)

echo.
echo Ambiente configurado.
echo Ative com: .venv\Scripts\activate
echo Configure a DATABASE_URL no arquivo .env.
echo.
pause
exit /b 0

:fail
echo.
echo Falha ao configurar o ambiente.
echo Verifique a mensagem acima. Normalmente isso acontece quando o Python 3.12 nao esta instalado.
echo.
pause
exit /b 1
