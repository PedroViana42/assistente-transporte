# Consolidacao arquitetural

Data: 2026-07-09

## Resultado

A consolidacao foi concluida. O repositorio agora possui apenas uma aplicacao operacional:

- Next.js
- React
- App Router
- API Routes
- Server Actions
- PostgreSQL Neon
- Deploy na Vercel

A aplicacao Python local, Streamlit, CLI, SQLAlchemy, Alembic e scripts `.bat` foram removidos do controle do Git.

## Matriz final de paridade

| Funcionalidade | Antes | Agora | Situacao | Observacao |
| -------------- | ----- | ----- | -------- | ---------- |
| Conexao com Neon | Python e Next.js | `src/lib/db.ts` com `pg.Pool` | equivalente | `DATABASE_URL` fica server-side |
| Teste de conexao | CLI Python | `/api/health` | equivalente | Health check oficial |
| Importacao `.xlsx` | Python e Next.js | `/api/upload` | equivalente | Processamento em memoria |
| Leitura de abas | Python via OpenPyXL | Parser ZIP/XML web | equivalente | Abas preservadas |
| Deteccao de cabecalho | Parcial | Primeiras 20 linhas | melhorado | Testado com Vitest |
| Mapeamento de colunas | Python e web separados | `src/lib/import/column-mapper.ts` | consolidado | Aliases centralizados |
| Normalizadores | Python e web separados | `src/lib/import/normalizers.ts` | consolidado | Testes unitarios |
| Duplicidade | Python e web | `ON CONFLICT (order_number) DO NOTHING` | equivalente | Contabiliza skipped |
| Motoristas | Python e web | `ON CONFLICT (normalized_name)` | equivalente | Reuso por chave normalizada |
| Pedidos | Python e web | Insercao web oficial | equivalente | Fonte final no Next.js |
| Lotes de importacao | Python e web | `import_batches` web | equivalente | Historico no upload e importacoes |
| Erros por linha | Python e web | `import_errors` web | equivalente | Continua processamento |
| Careacao da planilha | Regra antiga existia | Nao cria automaticamente | nao necessaria | Cliente abre manualmente |
| Busca de pedido | Streamlit e web | `/pedidos` | equivalente | Busca parcial parametrizada |
| Tratamento de careacao | Streamlit e web | `/careacoes/[id]` | equivalente | Confirmacao para status final |
| Historico de careacao | Ausente | `careacao_history` | implementado | Migration SQL aplicada |
| Listagem de careacoes | Sem paginacao real | Paginacao, filtros e busca | melhorado | Total e pagina na UI |
| Preservar filtros | Ausente | `returnTo` seguro | implementado | Botao Voltar contextual |
| Relatorio geral | Python e web | `/api/relatorios` | equivalente | Excel em memoria |
| Relatorio filtrado | Ausente na web | Exportacao de careacoes filtradas | implementado | Sem salvar arquivo |
| Migrations | Alembic e SQL web | SQL web unico | consolidado | `npm run migrate` |
| Testes | Pytest Python | Vitest web | consolidado | 21 testes unitarios |
| Comandos na raiz | Python | npm scripts | consolidado | `npm install`, `dev`, `test`, `build`, `migrate` |

## Estrutura final

```text
/
  package.json
  package-lock.json
  next.config.mjs
  vercel.json
  vitest.config.ts
  src/
    app/
    lib/
  scripts/
    migrate.mjs
    hash-password.mjs
  migrations/
    001_web_manual_careacao.sql
  docs/
  .env.example
  README.md
```

## Arquivos removidos

- `app/`
- `tests/` Python
- `requirements.txt`
- `alembic.ini`
- scripts `.bat`
- `setup.sh`
- `migrations/versions/`
- arquivos operacionais rastreados de `data/`
- pasta rastreada `web_vercel/`

## Comandos oficiais

```sh
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run migrate
```

## Validacao

- `npm run test`: passou.
- `npm run lint`: passou.
- `npm run build`: passou com rotas App Router.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm run migrate`: aplicado com sucesso.

## Decisoes de negocio

- Careacoes sao abertas manualmente pelo usuario apos pesquisar o pedido.
- Valores, culpa do cliente, motivo, observacao interna e resposta do motorista ficam em `careacao_cases`.
- Alteracoes sao registradas em `careacao_history`.
- A planilha e base de pedidos/motoristas/datas, nao fonte automatica de careacoes.

## Pendencias planejadas

- Testes end-to-end com Playwright.
- Banco de teste dedicado para integracao automatizada.
- Processamento externo/fila para arquivos grandes.
- Usuarios individuais e permissoes.
