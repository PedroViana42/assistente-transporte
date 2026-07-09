# Sugestoes de Melhoria

Data: 2026-07-09

## Ja implementado nesta consolidacao

- Next.js movido para a raiz.
- Python local, Streamlit, CLI e Alembic removidos do Git.
- `npm install`, `npm run test`, `npm run lint`, `npm run build` e `npm run migrate` funcionam na raiz.
- Upload com botao bloqueado, texto de carregamento e spinner.
- Historico de importacoes na tela de upload.
- Busca por pedido na tela de careacoes.
- Filtros por status, motorista e periodo.
- Paginacao real em careacoes.
- Preservacao dos filtros ao abrir e voltar do detalhe.
- Confirmacao antes de resolver ou cancelar.
- Historico de alteracoes de careacao.
- Exportacao filtrada de careacoes.
- Testes unitarios web com Vitest.

## Indispensaveis antes de entregar ao cliente

1. Confirmar variaveis de ambiente em Production.
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `ADMIN_PASSWORD_HASH`

2. Conferir a configuracao da Vercel.
   - Root Directory deve ser vazio/raiz.
   - Framework Preset deve ser Next.js.

3. Rodar health check apos deploy.
   - `/api/health`

4. Testar com uma planilha real do cliente em ambiente controlado.
   - Confirmar cabecalhos.
   - Confirmar tempo de importacao.
   - Confirmar erros por linha.

5. Trocar senha temporaria por senha final do cliente.
   - Gerar hash com `npm run hash-password`.

## Recomendadas para curto prazo

1. Configurar testes end-to-end com Playwright.
   - Login.
   - Upload.
   - Busca por pedido.
   - Edicao de careacao.
   - Exportacao.

2. Criar banco de teste separado.
   - Permite testar duplicidade, erros e historico sem tocar no Neon de producao.

3. Exportar erros de importacao em Excel.
   - Ajuda o cliente a corrigir linhas invalidas.

4. Melhorar observabilidade.
   - Registrar duracao de importacao.
   - Registrar `import_batch_id` em logs.
   - Evitar dados sensiveis em logs.

## Melhorias futuras

1. Usuarios individuais e permissoes.
   - Hoje existe senha unica administrativa.

2. Processamento assincrono de arquivos grandes.
   - Vercel serverless pode nao suportar cargas muito grandes em uma unica requisicao.
   - Considerar fila, worker externo ou servico dedicado.

3. Auditoria com usuario real.
   - `careacao_history` ja esta preparado com `actor`, mas ainda usa `admin`.

4. Template oficial de planilha.
   - Reduz erros de cabecalho e modelo.

5. Dashboard operacional mais completo.
   - Indicadores por periodo.
   - Casos antigos.
   - Total por motorista.

## Fora do escopo atual

- WhatsApp.
- OCR.
- IA para leitura de documentos.
- Portal publico para motoristas.
- Multiempresa/multitenancy.
- Pagamentos ou cobranca automatica.
- Armazenamento permanente de arquivos enviados.
