# Sugestoes de Melhoria

Data: 2026-07-09

## Indispensaveis antes de entregar

1. Manter `Root Directory = web_vercel` na Vercel.
   - Impacto: evita que a Vercel tente executar a aplicacao Python local.
   - Esforco: baixo.

2. Confirmar as variaveis de ambiente em Production.
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `ADMIN_PASSWORD_HASH`
   - Impacto: sem isso login e banco falham.
   - Esforco: baixo.

3. Executar `npm run migrate` antes/apos deploy quando houver mudanca de schema.
   - Impacto: garante tabelas, indices e constraints no Neon.
   - Esforco: baixo.

4. Validar upload real com uma planilha do cliente.
   - Impacto: confirma nomes de colunas e estrutura das abas.
   - Esforco: baixo.

5. Trocar a senha temporaria de teste por uma senha final do cliente.
   - Impacto: reduz risco de acesso indevido.
   - Esforco: baixo.

## Recomendadas para curto prazo

1. Melhorar a tela de upload com estado de carregamento.
   - Botao desabilitado durante envio.
   - Texto "Importando, aguarde".
   - Evita clique duplicado.
   - Esforco: baixo/medio, exige componente client.

2. Mostrar historico de importacoes recentes na propria tela de upload.
   - Ajuda o usuario a confirmar que o arquivo foi processado.
   - Esforco: baixo.

3. Adicionar busca por numero do pedido na tela de careacoes.
   - Hoje a busca por pedido fica em `/pedidos`.
   - Esforco: baixo.

4. Preservar filtros ao voltar do detalhe da careacao.
   - Melhora operacao diaria.
   - Esforco: medio.

5. Adicionar exportacao do resultado filtrado de careacoes.
   - Hoje o relatorio e geral por tipo.
   - Esforco: medio.

6. Adicionar pagina de diagnostico administrativa.
   - Pode consumir `/api/health`.
   - Nao deve mostrar secrets.
   - Esforco: baixo.

7. Criar testes automatizados para o app Next.js.
   - Unitarios para status, upload e parser XLSX.
   - Integracao com banco de teste.
   - Esforco: medio.

## Melhorias futuras

1. Historico de alteracoes de careacao.
   - Registrar quem alterou, status anterior, status novo e data.
   - Exige nova tabela.
   - Esforco: medio/alto.

2. Usuarios reais e permissoes.
   - Hoje existe senha unica.
   - Cliente pode precisar separar operador/admin.
   - Esforco: alto.

3. Processamento assincrono de arquivos grandes.
   - Vercel serverless tem limite de tempo/memoria.
   - Para planilhas grandes, considerar fila ou worker externo.
   - Esforco: alto.

4. Preview dos erros de importacao com download em Excel.
   - Facilita correcao pelo cliente.
   - Esforco: medio.

5. Observabilidade estruturada.
   - Logs com `import_batch_id`, status e duracao.
   - Sem dados sensiveis.
   - Esforco: medio.

6. Separar repositorios ou pacotes.
   - Um repo para app web e outro para automacao local.
   - Reduz confusao de deploy.
   - Esforco: medio.

## Funcionalidades fora do escopo atual

1. WhatsApp.
2. OCR.
3. IA para leitura de documentos.
4. Portal publico para motoristas.
5. Multiempresa/multitenancy.
6. Pagamentos ou cobranca automatica.
7. Armazenamento permanente de arquivos enviados.

