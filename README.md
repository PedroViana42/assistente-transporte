# Assistente de Transporte

Painel local para importar planilhas de entregas, consultar pedidos e tratar careacoes no banco Neon PostgreSQL.

## Uso local

1. Configure o `.env` com a URL do Neon.
2. Instale as dependencias.
3. Abra o painel.

```bat
setup.bat
ABRIR_PAINEL.bat
```

Exemplo de `.env`:

```env
DATABASE_URL=postgresql+psycopg2://usuario:senha@host.neon.tech/neondb?sslmode=require
APP_ENV=development
```

## Funcionalidades

- Resumo de pedidos, motoristas, careacoes e descontos
- Upload/importacao de planilha Excel
- Busca de pedido para abrir careacao manualmente
- Registro de valor da careacao
- Registro se foi culpa do cliente
- Motivo, observacao interna e resposta do motorista
- Lista de careacoes com filtro por motorista, status e data
- Relatorios Excel
- Historico de importacoes e erros

## Comandos

```sh
python -m app.cli testar-conexao
python -m app.cli importar data/entrada/Exemplo.xlsx
python -m app.cli importar-pasta data/entrada
python -m app.cli resumo
python -m app.cli listar-importacoes
python -m app.cli exportar-relatorio
python -m streamlit run app/streamlit_app.py
```

## Banco

Aplicar migrations:

```sh
python -m alembic upgrade head
```

## Vercel

A versao online em Next.js esta em `web_vercel/`. Ela inclui upload de Excel, resumo, pendencias/careacoes, importacoes/erros e relatorios para deploy na Vercel usando o mesmo Neon.
