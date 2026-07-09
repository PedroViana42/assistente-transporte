# QA Relatorio Final

Data: 2026-07-09

## 1. Resumo executivo

Foi executada uma rodada de QA sobre a arquitetura atual do Assistente de Transporte. O projeto possui uma automacao Python local e uma aplicacao Next.js para Vercel. Os principais problemas encontrados estavam concentrados no deploy da Vercel e no fluxo de upload/importacao de Excel.

Foram corrigidos problemas bloqueadores e criticos: deploy apontando para a aplicacao Python errada, crash no parser XLSX em producao, importacao com zero linhas sem mensagem clara, ausencia de limite de upload e falta do status `aguardando_motorista`.

## 2. Arquitetura final

- `app/`: automacao Python local, CLI, Streamlit, SQLAlchemy e Alembic.
- `web_vercel/`: aplicacao web Next.js para Vercel.
- Banco: PostgreSQL Neon.
- Upload: API Route Node.js em `/api/upload`, processamento em memoria.
- Relatorios: API Route Node.js em `/api/relatorios`, Excel retornado como download.
- Careacoes: Server Actions para criar/atualizar casos.
- Saude: `/api/health`, retornando status do banco sem secrets.

## 3. Erros encontrados

| ID | Severidade | Problema | Causa | Correcao | Status |
| -- | ---------- | -------- | ----- | -------- | ------ |
| QA-001 | Bloqueador | Vercel 500 na raiz | Root Directory apontava para a raiz Python | Deploy e orientacao para `Root Directory=web_vercel` | Corrigido |
| QA-002 | Critico | `/api/upload` 500 | Parser `read-excel-file` falhava com planilha real | Parser em memoria com `jszip` + `fast-xml-parser` | Corrigido |
| QA-003 | Alto | Importacao `success` com zero linhas | Cabecalho nao estava na primeira linha reconhecida | Busca cabecalho nas primeiras 20 linhas e falha clara quando nao acha | Corrigido |
| QA-004 | Medio | Sem limite de upload | API aceitava qualquer tamanho de `.xlsx` | Limite de 8 MB e erro amigavel | Corrigido |
| QA-005 | Medio | Status `aguardando_motorista` ausente | Regra de negocio evoluiu | Status adicionado em UI, SQL e model Python | Corrigido |
| QA-006 | Medio | Sem endpoint de saude | Nao havia diagnostico simples de banco/deploy | Criado `/api/health` | Corrigido |
| QA-007 | Medio | Sem testes automatizados do Next.js | Projeto nao tem runner web configurado | Documentado como pendencia | Pendente |
| QA-008 | Medio | Sem loading no upload | Formulario server-rendered simples | Documentado como melhoria curta | Pendente |
| QA-009 | Medio | Sem historico de alteracoes | Modelo atual guarda apenas estado atual | Documentado como melhoria futura | Pendente |

## 4. Erros corrigidos

- Deploy da Vercel usando Next.js em `web_vercel`.
- Upload compativel com serverless, sem filesystem permanente.
- Tratamento de arquivo vazio, extensao invalida, arquivo acima de 8 MB e falha de processamento.
- Resultado de importacao exibe `error_message`.
- Historico de importacoes exibe mensagem do lote.
- Novo status `aguardando_motorista`.
- Health check de banco.
- Migration web idempotente para constraint de status.
- Migration Alembic nao destrutiva para status novo.

## 5. Erros ainda pendentes

- Falta teste automatizado da camada Next.js.
- Falta loading/bloqueio visual durante upload.
- Falta historico de alteracoes de careacao.
- Falta paginacao real para listas grandes.
- Falta exportacao filtrada de careacoes.
- Falta autenticacao com usuario individual.

## 6. Testes executados

| Comando/acao | Resultado |
| ------------ | --------- |
| `python -m pytest` | 52 testes passaram |
| `npm run build` em `web_vercel` | Build Next.js passou |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm run migrate` em `web_vercel` | Migration web aplicada com sucesso |
| `GET /api/health` em producao | 200, banco ok |
| Login em producao | 303 para `/`, cookie criado |
| Upload XLSX valido com cabecalho na terceira linha | 303 para `/upload?batch=...` |
| Upload repetido do mesmo arquivo | Pedido duplicado pulado |
| Linha sem numero de pedido | Erro de linha registrado |
| Relatorio completo em producao | 200, arquivo Excel gerado |
| Consulta logs Vercel 500 apos deploy | Nenhum 500 recente |

## 7. Resultados dos testes

- Importacao QA em producao criou lote `partial_success` com:
  - `total_rows=2`
  - `imported_rows=1`
  - `error_rows=1`
- Reimportacao do mesmo arquivo criou lote com:
  - `imported_rows=0`
  - `skipped_rows=1`
  - `error_rows=1`
- Dados artificiais `QA_FULL_%` foram removidos do Neon apos o teste.

## 8. Build local

Build local validado com:

```sh
cd web_vercel
npm run build
```

Resultado: sucesso.

## 9. Build de producao

Deploy de producao executado com:

```sh
npx vercel --prod --yes
```

Resultado: sucesso e alias para `https://assistente-transporte.vercel.app`.

## 10. Validacao da Vercel

- Framework: Next.js.
- Root Directory necessario: `web_vercel`.
- Rotas serverless validas:
  - `/api/upload`
  - `/api/relatorios`
  - `/api/health`
- Nao ha dependencia de `localhost`.
- Upload e relatorio usam memoria, nao storage persistente.
- Logs recentes nao apresentaram 500 apos as correcoes.

## 11. Validacao do Neon

- Conexao validada com `select 1`.
- Migrations web aplicadas.
- Indices principais presentes no SQL web:
  - `orders.order_number`
  - `orders.driver_id`
  - `careacao_cases.order_id`
  - `careacao_cases.driver_id`
  - `careacao_cases.status`
  - `import_batches.started_at`
- Dados QA removidos apos testes.

## 12. Seguranca

- Secrets nao foram versionados.
- `.env`, `.env.local` e `.vercel` estao ignorados.
- `DATABASE_URL` usada somente no servidor.
- Queries usam parametros.
- Cookie de sessao e `httpOnly`, `sameSite=lax` e `secure` em producao.
- Upload valida extensao e tamanho.
- Ainda falta auditoria por usuario individual.

## 13. Performance

- Pool do Neon limitado por `DB_POOL_MAX`, padrao 3.
- Upload processa arquivo em memoria.
- Limite atual: 8 MB.
- Para planilhas grandes, recomenda-se fila/worker fora da funcao serverless.

## 14. Usabilidade

Melhorias implementadas:

- Mensagens para arquivo vazio, formato invalido, tamanho excedido e falha de processamento.
- Mensagem do lote aparece na tela de upload/importacoes.
- Novo status legivel `Aguardando motorista`.
- Badge visual para o novo status.

Pendencias:

- Loading no upload.
- Historico de importacoes na tela de upload.
- Confirmacao antes de resolver/cancelar.
- Preservar filtros ao voltar.

## 15. Melhorias implementadas

- `docs/QA_DIAGNOSTICO_INICIAL.md`.
- `docs/SUGESTOES_DE_MELHORIA.md`.
- `docs/QA_RELATORIO_FINAL.md`.
- `/api/health`.
- Limite de upload.
- Tratamento amigavel de erro de upload.
- Status `aguardando_motorista`.
- Migration Alembic para status novo.
- Constraint SQL web atualizada.

## 16. Melhorias recomendadas

Ver `docs/SUGESTOES_DE_MELHORIA.md`.

Prioridade curta:

1. Loading no upload.
2. Testes automatizados web.
3. Busca por pedido na tela de careacoes.
4. Exportacao filtrada.
5. Historico de alteracoes.

## 17. Instrucoes para deploy

Na Vercel:

```text
Framework Preset: Next.js
Root Directory: web_vercel
Build Command: npm run build
Install Command: npm install
Output Directory: vazio/padrao
```

Variaveis:

```env
DATABASE_URL=...
AUTH_SECRET=...
ADMIN_PASSWORD_HASH=...
```

Comandos:

```sh
cd web_vercel
npm install
npm run migrate
npm run build
```

Deploy:

```sh
npx vercel --prod --yes
```

## 18. Instrucoes para rollback

1. Na Vercel, abrir `Deployments`.
2. Selecionar o deploy anterior estavel.
3. Clicar em `Promote to Production`.
4. Se houver migration nova, avaliar rollback manual antes de promover versao antiga.

Migration adicionada nesta rodada e nao destrutiva. Ela apenas amplia status permitido. O downgrade Alembic remove `aguardando_motorista` da constraint; antes de rodar downgrade, confirmar que nao existem linhas com esse status.

## 19. Checklist de aceite

- [x] Dependencias web instalam sem erro.
- [ ] Lint passa: nao ha script de lint configurado.
- [x] Analise de tipos passa via `next build`.
- [x] Testes Python passam.
- [x] Build de producao passa.
- [x] Aplicacao abre na Vercel.
- [x] Conexao com Neon funciona.
- [x] Upload de arquivo funciona.
- [x] Importacao nao duplica pedidos.
- [x] Erros de linha sao registrados.
- [x] Tela de careacoes carrega.
- [x] Filtros basicos funcionam por query SQL parametrizada.
- [x] Atualizacao de status persiste.
- [x] Observacoes persistem.
- [x] Relatorio e gerado.
- [x] Dados sensiveis nao aparecem no frontend.
- [x] Deploy na Vercel funciona.
- [x] Erros de upload sao tratados com mensagens amigaveis.
- [x] Documentacao de QA criada.

