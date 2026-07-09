# Consolidacao arquitetural

Data da auditoria: 2026-07-09

Escopo executado nesta rodada: etapas 1 e 2 do roteiro de consolidacao. Nenhum arquivo foi removido, nenhum dado de producao foi alterado e nenhuma migration foi executada.

## Situacao atual

O repositorio ainda possui duas aplicacoes operacionais:

- Python local na raiz: `app/`, `migrations/`, `tests/`, `requirements.txt`, scripts `.bat` e pastas `data/`.
- Next.js para Vercel em `web_vercel/`: App Router, API Routes, Server Actions, PostgreSQL Neon e geracao de relatorios em memoria.

A aplicacao definitiva deve ser a web em Next.js. A versao Python deve deixar de ser operacional somente depois que as funcionalidades necessarias estiverem cobertas na aplicacao web.

## Matriz de paridade

| Funcionalidade | Python | Next.js | Situacao | Acao necessaria |
| -------------- | ------ | ------- | -------- | --------------- |
| Conexao com Neon | `app/config.py` e SQLAlchemy leem `DATABASE_URL` com `sslmode=require`. | `src/lib/db.ts` usa `pg.Pool`, normaliza `postgresql+psycopg2://` e usa SSL quando a URL contem `sslmode`. | equivalente | Manter somente a conexao web apos consolidacao. |
| Teste de conexao | CLI `testar-conexao` executa `SELECT 1`. | `/api/health` executa `select 1`. | equivalente | Documentar `/api/health` como teste oficial. |
| Importacao `.xlsx` | Pandas/OpenPyXL le arquivo local. | API `/api/upload` recebe upload e parser XLSX em memoria com JSZip/XML. | equivalente | Manter limite e mensagens claras no upload web. |
| Leitura de multiplas abas | `read_excel_sheets()` le abas com coluna de pedido na primeira linha. | `readXlsxSheets()` le todas as abas do workbook. | parcialmente equivalente | Web e mais ampla, mas precisa testes unitarios para multiplas abas. |
| Ignorar abas vazias | Remove linhas totalmente vazias e ignora DataFrames vazios. | `cleanRows()` remove linhas vazias e ignora abas sem cabecalho reconhecido. | equivalente | Criar fixture/teste web para aba vazia. |
| Deteccao de cabecalho | Python considera a primeira linha da aba. | Web procura o cabecalho nas primeiras 20 linhas. | parcialmente equivalente | Web cobre mais casos; documentar e testar a regra. |
| Mapeamento de colunas | `COLUMN_ALIASES` mapeia pedido, motorista, datas, booleanos e desconto. | `column-mapper.ts` mapeia pedido, motorista e datas usadas no fluxo web. | parcialmente equivalente | Centralizar aliases web e decidir se campos antigos de careacao/desconto da planilha continuam fora do escopo. |
| Normalizacao de numero de pedido | Remove notacao cientifica e retorna string. | Remove `.0`, trata numero e notacao cientifica simples. | equivalente | Criar testes web para notacao cientifica e numeros grandes. |
| Normalizacao de motorista | Remove espacos duplicados. | Remove espacos duplicados. | equivalente | Criar testes web. |
| Chave normalizada de motorista | Sem acento, uppercase e espacos normalizados. | Sem acento, uppercase e espacos normalizados. | equivalente | Criar testes web. |
| Normalizacao de booleanos | Aceita SIM/S/TRUE/1 e NAO/N/FALSE/0. | Nao existe normalizador generico de booleano para importacao. | nao necessaria na versao web | O fluxo atual nao importa careacao/desconto da planilha; manter fora do importador ou implementar apenas se a regra voltar. |
| Normalizacao de datas | Pandas aceita datetime, `Timestamp`, string e dayfirst. | `normalizeDate()` aceita `Date`, serial numerico do Excel e `new Date(string)`. | parcialmente equivalente | Melhorar parsing dayfirst em Next.js antes de remover Python. |
| Normalizacao de horario | Python converte para `time`. | `normalizeTime()` gera `HH:mm:ss`. | equivalente | Testar serial Excel, string e vazio. |
| Normalizacao decimal | Python aceita virgula e ponto para desconto/relatorio. | Valor de careacao e tratado nas Server Actions; importador nao possui normalizador decimal exportado. | parcialmente equivalente | Extrair normalizador decimal web reutilizavel para careacao e relatorios. |
| Validacao de campos obrigatorios | Pedido e motorista obrigatorios por linha; erro registrado. | Pedido e motorista obrigatorios por linha; erro registrado. | equivalente | Criar testes web de erro por linha. |
| Prevencao de duplicidade | Cache em memoria e insert em lote; duplicado conta como skipped. | `ON CONFLICT (order_number) DO NOTHING`; duplicado conta como skipped. | equivalente | Testar importacao repetida em banco de teste. |
| Criacao de motoristas | Busca/cria por `normalized_name`. | `INSERT ... ON CONFLICT (normalized_name)` atualiza nome e retorna id. | equivalente | Testar criacao e reuso. |
| Criacao de pedidos | Insere pedido com motorista, datas, origem e flags legadas falsas. | Insere pedido com motorista, datas, origem e flags legadas falsas. | equivalente | Manter `source_sheet` e `source_file`. |
| Lotes de importacao | Cria `import_batches`, status `running/success/partial_success/failed`. | Cria `import_batches` com os mesmos contadores e status. | equivalente | Exibir historico na tela de upload, alem da tela de importacoes. |
| Erros por linha | Salva `import_errors` com linha, JSON e mensagem. | Salva `import_errors` com linha, JSON e mensagem. | equivalente | Exibir acao clara para consultar erros do lote. |
| Erro geral de importacao | Batch `failed` com `error_message`. | Batch `failed` com `error_message`; upload redireciona erro amigavel. | equivalente | Melhorar mensagens para arquivo corrompido/modelo incompativel. |
| Careacao vinda da planilha | Regra antiga foi neutralizada: importador Python seta flags falsas e comentario indica preenchimento manual. | Importador web tambem nao cria careacao a partir da planilha. | nao necessaria na versao web | Manter regra oficial: cliente pesquisa pedido e abre careacao manualmente. |
| Busca de pedido para abrir careacao | Streamlit busca pedido por numero parcial. | `/pedidos?pedido=` busca por `ILIKE` parametrizado. | equivalente | Preservar busca manual no fluxo web. |
| Criacao manual de careacao | Streamlit cria/atualiza `careacao_cases`. | `createCareacaoAction()` cria ou atualiza por `order_id`. | equivalente | Adicionar historico antes da consolidacao final, se aprovado. |
| Tratamento de careacao | Streamlit edita status, valor, culpa, motivo, observacao e resposta. | Pagina `/careacoes/[id]` edita status, valor, culpa, motivo, observacao e resposta. | equivalente | Adicionar confirmacao para resolver/cancelar. |
| Status de careacao | Python model aceita `aguardando_motorista`, mas Streamlit nao exibe essa opcao. | `status.ts` e UI exibem todos os status, incluindo `aguardando_motorista`. | parcialmente equivalente | Next.js deve ser a referencia final de status. |
| Fechamento de careacao | Streamlit define `closed_at` para resolvido/cancelado. | Server Action define `closed_at` para resolvido/cancelado. | equivalente | Adicionar confirmacao e historico. |
| Sincronia com campos legados de `orders` | Streamlit atualiza `order.has_careacao`, `order.is_resolved` e `order.internal_note`. | Next.js usa `careacao_cases` como fonte e nao sincroniza flags legadas em `orders`. | parcialmente equivalente | Decidir se flags de `orders` serao obsoletas ou sincronizadas por compatibilidade. |
| Dashboard/resumo | Streamlit mostra pedidos, motoristas, pendentes, desconto e soma. | Home mostra resumo via `getDashboardStats()`. | equivalente | Manter baseado em `careacao_cases`. |
| Listagem de careacoes | Streamlit lista careacoes e filtra em memoria. | `/careacoes` consulta banco com filtros e `LIMIT 100`. | parcialmente equivalente | Implementar busca por pedido, paginacao real, total de resultados e ordenacao. |
| Filtro por motorista | Streamlit filtra em memoria. | Query parametrizada por `d.name ILIKE`. | equivalente | Manter parametrizado. |
| Filtro por status | Streamlit filtra em memoria. | Query parametrizada por `c.status`. | equivalente | Validar status permitido na listagem. |
| Filtro por periodo | Streamlit filtra em memoria por abertura. | Query parametrizada por data de abertura. | equivalente | Preservar via URL e testar. |
| Preservar filtros ao abrir detalhe | Nao ha rota web local com URL persistente; Streamlit e stateful. | Link para detalhe nao preserva query da listagem. | ausente no Next.js | Adicionar `returnTo` ou query params nos links e botao Voltar contextual. |
| Paginacao | Nao ha paginacao real. | Nao ha paginacao real; existe `LIMIT 100`. | ausente no Next.js | Implementar `page`, `pageSize`, `COUNT(*)` e `OFFSET`/keyset. |
| Confirmacao para resolver/cancelar | Nao ha confirmacao modal dedicada. | Nao ha confirmacao; formulario salva direto. | ausente no Next.js | Criar componente client de confirmacao para status finais. |
| Historico de alteracoes de careacao | Ausente. | Ausente. | ausente no Next.js | Criar migration nao destrutiva `careacao_history` e registrar create/update/status. |
| Historico de importacoes | CLI e Streamlit listam lotes e erros. | `/importacoes` lista lotes e erros. | equivalente | Reaproveitar na tela de upload como historico curto. |
| Relatorio completo | Python gera arquivo local com Pedidos, Resumo e Pendencias. | Web gera Excel em memoria com Pedidos, Resumo e Careacoes. | parcialmente equivalente | Ajustar nomenclatura/abas oficiais e documentar diferenca entre Pendencias e Careacoes. |
| Relatorio por tipo | Python aceita `completo`, `pedidos`, `resumo_motorista`, `pendencias`, `personalizado`. | Web aceita `completo`, `pedidos`, `resumo_motorista`, `careacoes`. | parcialmente equivalente | Implementar relatorio filtrado de careacoes e avaliar relatorio personalizado por campos/data. |
| Relatorio personalizado por periodo/campos | Existe no Python. | Ausente. | ausente no Next.js | Planejar versao web se o cliente realmente precisar selecionar periodo e campos. |
| Exportacao sem filesystem persistente | Python salva em `data/exportacoes`. | Web gera buffer e retorna download. | equivalente para Vercel | Manter somente geracao em memoria na web. |
| CLI local | Typer oferece importar, importar-pasta, resumo, listar-importacoes e exportar-relatorio. | Rotas web/API substituem o uso pelo cliente. | obsoleta | Remover apos autorizacao e paridade validada. |
| Streamlit local | Painel local operacional. | Next.js substitui com interface web. | obsoleta | Remover apos autorizacao e paridade validada. |
| Alembic | Migrations Python existem em `migrations/versions`. | Migration SQL web existe em `web_vercel/sql/001_web_manual_careacao.sql`. | parcialmente equivalente | Padronizar migrations SQL oficiais e remover Alembic depois. |
| Indices exigidos | Alembic cria indices principais; depende da versao aplicada. | SQL cria indices para `orders.order_number`, `orders.driver_id`, careacoes e import batches. | parcialmente equivalente | Adicionar indice web para `orders.created_datetime`; revisar idempotencia da constraint de status. |
| Testes automatizados | Pytest cobre importador, normalizadores, models e relatorios Python. | Nao ha estrutura de testes Next.js. | ausente no Next.js | Configurar Vitest e depois Playwright com banco de teste. |
| Scripts de instalacao | `.bat` e `setup.sh` instalam Python local. | `web_vercel/package.json` possui scripts Node. | parcialmente equivalente | Mover scripts Node para raiz e remover scripts Python obsoletos depois. |
| Comandos na raiz | Python roda na raiz; `npm` nao roda na raiz. | `npm` roda apenas dentro de `web_vercel`. | ausente no Next.js | Mover aplicacao web para raiz para cumprir comandos oficiais. |
| Seguranca de secrets | `.env` ignorado; Python le `.env`. | Auth e banco ficam server-side; cookies httpOnly; `.env.local` ignorado. | equivalente | Atualizar README para uma unica arquitetura e documentar senha unica como limitacao MVP. |

## Decisao da etapa 2

Estrategia escolhida para a arquitetura definitiva: estrategia preferida, movendo a aplicacao Next.js de `web_vercel/` para a raiz do repositorio.

Motivo:

- O criterio de aceite exige `npm install`, `npm run dev`, `npm run test`, `npm run build` e `npm run migrate` na raiz.
- A configuracao atual ja causou erro na Vercel quando o projeto apontou para a raiz Python.
- Manter `web_vercel/` como raiz logica perpetua a duplicidade e exige `Root Directory=web_vercel`, que e uma fonte real de erro operacional.

Risco:

- A Vercel esta funcionando hoje com `Root Directory=web_vercel`. A mudanca para raiz deve ocorrer em commit proprio, com build local antes e ajuste do projeto na Vercel no mesmo momento da publicacao.

Decisao operacional:

- Nao mover arquivos nesta rodada.
- Nao remover Python nesta rodada.
- Avancar para migracao somente depois de autorizacao explicita.

## Plano exato de migracao

1. Criar commit de seguranca com esta auditoria.
2. Corrigir lacunas web antes da remocao: parser de datas dayfirst, normalizador decimal reutilizavel, indice `orders.created_datetime`, testes web, paginacao/filtros de careacoes, preservacao de filtros, confirmacao para status final, exportacao filtrada e historico de careacao.
3. Mover `web_vercel/package.json`, `package-lock.json`, `next.config.mjs`, `tsconfig.json`, `vercel.json`, `src/`, `scripts/`, `public/` se existir e `.env.example` para a raiz.
4. Converter `web_vercel/sql/001_web_manual_careacao.sql` para a estrutura oficial `migrations/001_initial.sql` ou `migrations/001_web_manual_careacao.sql`.
5. Atualizar `scripts/migrate.mjs` para ler SQL em `migrations/`.
6. Atualizar `.gitignore` da raiz para cobrir `.env`, `.env.local`, `.vercel`, `.next`, `node_modules`, logs, uploads temporarios e relatorios gerados.
7. Atualizar README para remover instrucoes Python, Streamlit, CLI, Alembic e scripts `.bat`.
8. Ajustar Vercel para usar a raiz do repositorio como Root Directory.
9. Rodar `npm install`, `npm run lint`, `npm run test`, `npm run build` e `npm audit --omit=dev`.
10. Aplicar `npm run migrate` somente contra banco autorizado e nao destrutivo.
11. Validar login, dashboard, upload, importacoes/erros, pedidos, careacoes, relatorios, health check e deploy.
12. Depois da validacao e autorizacao, remover ou arquivar a arquitetura Python: `app/`, Alembic, `requirements.txt`, scripts `.bat`, `setup.sh`, `data/` operacional e testes Python que nao servirem como fixtures.

## Arquivos que nao devem ser removidos ainda

- `app/`
- `migrations/` Alembic
- `tests/` Pytest
- `requirements.txt`
- scripts `.bat` e `setup.sh`
- pastas `data/`
- documentos em `docs/`

## Funcionalidades que bloqueiam a remocao segura do Python

Antes de remover a aplicacao Python, a versao Next.js deve receber ou confirmar:

- testes unitarios para normalizadores, aliases, deteccao de cabecalho e importacao;
- testes de integracao com banco de teste para duplicidade, erro por linha e criacao de motorista/pedido;
- relatorio filtrado de careacoes;
- decisao sobre relatorio personalizado por periodo/campos;
- paginacao real em careacoes;
- busca por numero do pedido dentro da listagem de careacoes;
- preservacao de filtros ao abrir e voltar do detalhe;
- confirmacao para resolver/cancelar;
- historico de alteracoes de careacao;
- migration SQL web revisada com indice de `orders.created_datetime`;
- README unico com fluxo web.

## Resultado desta rodada

- Auditoria de paridade concluida.
- Estrategia arquitetural definida: Next.js na raiz.
- Nenhum arquivo removido.
- Nenhuma migration executada.
- Nenhum dado de producao alterado.
