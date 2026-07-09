# QA Diagnostico Inicial

Data: 2026-07-09

## 1. Arquitetura encontrada

O projeto esta dividido em duas aplicacoes dentro do mesmo repositorio.

### Python local

- Pasta principal: `app/`
- Uso: automacao local, CLI, Streamlit, importacao Excel/CSV, relatorios locais e migrations Alembic.
- Banco: PostgreSQL Neon via SQLAlchemy/psycopg2.
- Interface local: `app/streamlit_app.py`.
- CLI: `app/cli.py` e `app/main.py`.
- Models: `app/models.py`.
- Migrations: `migrations/versions/`.

### Web para Vercel

- Pasta principal: `web_vercel/`
- Frontend/backend: Next.js App Router com React.
- Server-side: Server Components, Server Actions e API Routes Node.js.
- Banco: PostgreSQL Neon via `pg`.
- Deploy: Vercel, com `Root Directory` esperado como `web_vercel`.
- Autenticacao: senha unica de administrador via cookie assinado.

## 2. Fluxo atual da aplicacao

1. Usuario acessa a aplicacao web.
2. `RootLayout` chama `readSession()` e decide se mostra layout autenticado ou tela de login.
3. Login usa `loginAction()` em `web_vercel/src/app/actions.ts`.
4. Dashboard consulta `getDashboardStats()` e `getRecentOpenCases()`.
5. Upload em `/upload` envia formulario multipart para `/api/upload`.
6. `/api/upload` valida sessao, extensao `.xlsx`, carrega o arquivo em memoria e chama `importExcelFile()`.
7. `importExcelFile()` cria `import_batches`, le abas do XLSX em memoria, mapeia colunas, normaliza dados, cria motoristas/pedidos e registra erros por linha.
8. Tela `/pedidos` pesquisa pedidos e permite abrir manualmente uma careacao.
9. Tela `/careacoes` lista casos com filtros por status, motorista e periodo.
10. Tela `/careacoes/[id]` altera status, valor, culpa do cliente, motivo, observacao interna e resposta do motorista.
11. `/api/relatorios` gera Excel em memoria e retorna download.

## 3. Dependencias principais

### Python

- SQLAlchemy
- Alembic
- Pandas
- OpenPyXL
- Typer
- pytest
- python-dotenv
- psycopg2-binary
- Streamlit

### Web

- Next.js
- React
- pg
- exceljs
- jszip
- fast-xml-parser
- dotenv

## 4. Pontos frageis

- O repositorio contem duas arquiteturas validas, mas isso confunde deploy se a Vercel usar a raiz em vez de `web_vercel`.
- O app web e o app Python mantem logicas parecidas de importacao, mas nao sao uma unica fonte de verdade.
- A importacao web depende de mapeamento de cabecalhos; variacoes fora da lista podem gerar lote sem pedidos.
- O parser XLSX web e intencionalmente simples para ser compativel com Vercel; formulas/formatos complexos devem ser testados com planilhas reais.
- Upload e processamento ocorrem em uma funcao serverless; arquivos muito grandes podem bater limite de tempo/memoria.
- Nao ha paginacao real em careacoes, apenas `LIMIT 100`.
- Nao ha historico de alteracoes de careacao.
- Nao ha teste automatizado dedicado para a parte Next.js.
- Nao ha lint configurado para o web app.

## 5. Erros encontrados

| ID | Severidade | Problema | Causa provavel | Status |
| -- | ---------- | -------- | -------------- | ------ |
| QA-001 | Bloqueador | Vercel retornava 500 na raiz | Deploy apontava para a raiz Python e tentava executar `app.main:app` como ASGI/WSGI | Corrigido por deploy a partir de `web_vercel` e ajuste de Root Directory |
| QA-002 | Critico | `/api/upload` retornava 500 | Pacote `read-excel-file` falhava com `Cannot read properties of undefined (reading 'trim')` em planilha real | Corrigido trocando para parser em memoria com `jszip` + `fast-xml-parser` |
| QA-003 | Alto | Upload criava lote `success` com zero linhas | Importador procurava cabecalho apenas na primeira linha | Corrigido para procurar cabecalho nas primeiras 20 linhas e marcar `failed` quando nao ha linha importavel |
| QA-004 | Medio | Status esperado `aguardando_motorista` nao existe no banco/modelo | Regra de negocio evoluiu depois da migration inicial | Pendente; requer migration nao destrutiva |
| QA-005 | Medio | Tela de upload nao tem estado de carregamento/bloqueio contra clique duplo | Formulario HTML simples sem componente cliente | Pendente |
| QA-006 | Medio | Sem pagina de saude/diagnostico | Nao ha endpoint dedicado | Pendente |
| QA-007 | Baixo | Acentos aparecem ausentes em alguns textos da UI | Codigo usa ASCII por padrao | Aceitavel, mas melhora de UX futura |

## 6. Riscos de deploy

- Se `Root Directory` nao for `web_vercel`, a Vercel tenta subir a parte Python e quebra.
- Variaveis obrigatorias: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD_HASH`.
- `DATABASE_URL` deve usar SSL; a aplicacao normaliza `postgresql+psycopg2://` para `postgresql://`.
- As migrations web sao SQL idempotente via `npm run migrate`; elas nao rodam automaticamente no deploy.
- O arquivo enviado e processado em memoria, sem persistencia local, compativel com serverless.
- Relatorios sao gerados em memoria e retornados como download.

## 7. Problemas de seguranca

- A aplicacao web possui autenticacao simples por senha unica, sem usuarios individuais.
- Cookies sao `httpOnly`, `sameSite=lax` e `secure` em producao.
- Operacoes de banco ficam no servidor; `DATABASE_URL` nao aparece no frontend.
- SQL usa queries parametrizadas para entradas do usuario.
- Falta limite explicito de tamanho de upload.
- Falta auditoria de quem alterou cada careacao.
- Nao versionar `.env` e `.vercel` esta coberto por `.gitignore`.

## 8. Problemas de usabilidade

- Upload nao mostra progresso.
- Resultado de importacao pode ficar pouco claro quando nada foi importado.
- Historico de importacoes existe, mas nao aparece na tela de upload.
- Tela de careacoes nao tem busca por pedido.
- Filtros nao sao preservados ao voltar da tela de detalhe.
- Nao ha confirmacao antes de resolver/cancelar.
- Nao ha exportacao do resultado filtrado.
- Dashboard ainda e basico para operacao diaria.

## 9. Ordem recomendada para correcoes

1. Garantir deploy Vercel usando `web_vercel`.
2. Garantir upload XLSX sem crash e sem depender de filesystem persistente.
3. Melhorar feedback de importacao para zero linhas/erros.
4. Adicionar limite de tamanho e tratamento amigavel para arquivo corrompido.
5. Adicionar endpoint de saude/diagnostico sem vazar secrets.
6. Adicionar status `aguardando_motorista` com migration nao destrutiva.
7. Adicionar testes automatizados para importacao web e regras de careacao.
8. Melhorar UX de upload, dashboard e filtros.

## 10. Tabela de reproducao inicial

| Comando/acao | Resultado | Severidade | Causa provavel | Correcao recomendada |
| ------------ | --------- | ---------- | -------------- | -------------------- |
| Acessar Vercel com Root Directory incorreto | 500 `app.main:app` | Bloqueador | Vercel executou Python local | Configurar `Root Directory=web_vercel` |
| POST `/api/upload` em producao antes da troca do parser | 500 `reading 'trim'` | Critico | Parser XLSX incompativel com planilha | Parser em memoria baseado em ZIP/XML |
| Upload `CT01_valido_basico.xlsx` antes da busca de cabecalho | `success` com `total_rows=0` | Alto | Cabecalho nao estava na primeira linha reconhecida | Buscar cabecalho nas primeiras linhas e falhar com mensagem clara |

