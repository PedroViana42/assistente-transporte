#!/usr/bin/env sh
set -eu

if ! command -v python3.12 >/dev/null 2>&1; then
  echo "Python 3.12 nao encontrado. Instale o Python 3.12 e tente novamente."
  exit 1
fi

PYTHON_BIN=python3.12
"$PYTHON_BIN" --version

if [ ! -d .venv ]; then
  "$PYTHON_BIN" -m venv .venv
fi

. .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data/entrada data/processados data/erros data/exportacoes data/backups

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo
echo "Ambiente configurado."
echo "Ative com: . .venv/bin/activate"
echo "Configure a DATABASE_URL no arquivo .env."
