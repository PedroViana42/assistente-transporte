# Matriz de testes de importacao

Data: 2026-07-09

Escopo: aplicacao Next.js consolidada na raiz, importacao `.xlsx` em memoria e banco PostgreSQL Neon.

## Matriz

| ID | Cenario | Resultado esperado | Resultado obtido | Importados | Ignorados | Erros | Careacoes criadas | Observacoes |
| -- | ------- | ------------------ | ---------------- | ---------- | --------- | ----- | ----------------- | ----------- |
| IMP-001 | Arquivo `.xlsx` valido | Lote `success`, pedidos e motoristas criados | Coberto por importador web e build; exige banco de teste para integracao completa | A validar em banco de teste | A validar | A validar | 0 | Careacao e manual, nao vem da planilha |
| IMP-002 | Importacao repetida | Pedidos existentes contam como `skipped_rows` | Regra implementada com `ON CONFLICT DO NOTHING` | 0 em repeticao | >= 1 | 0 | 0 | Validar com banco de teste antes de carga real |
| IMP-003 | Multiplas abas | Todas as abas sao lidas e nomes preservados | Teste unitario `excel-parser.test.ts` passou | N/A | N/A | N/A | 0 | Parser le todas as abas do workbook |
| IMP-004 | Aba vazia | Aba sem linhas importaveis e ignorada | Teste unitario cobre workbook com aba vazia | N/A | N/A | N/A | 0 | Lote falha se nenhuma linha importavel existir |
| IMP-005 | Cabecalho fora da primeira linha | Cabecalho detectado nas primeiras 20 linhas | Teste unitario passou | N/A | N/A | N/A | 0 | Reduz erro com planilhas com titulo/cabecalho visual |
| IMP-006 | Variacoes de colunas | Colunas reconhecidas ignorando acento, caixa e pontuacao | Teste unitario `column-mapper.test.ts` passou | N/A | N/A | N/A | 0 | Inclui `Numero de pedido JMS`, `Responsavel pela entrega`, `DESCONTO` |
| IMP-007 | Numero de pedido em notacao cientifica | Valor vira string sem notacao cientifica | Teste unitario `normalizers.test.ts` passou | N/A | N/A | N/A | 0 | Parser preserva valor numerico bruto quando possivel |
| IMP-008 | Datas brasileiras | `dd/mm/aaaa` vira data valida | Teste unitario passou | N/A | N/A | N/A | 0 | Tambem aceita serial Excel |
| IMP-009 | Valor decimal com virgula | Valor vira decimal com ponto para persistencia | Teste unitario passou | N/A | N/A | N/A | 0 | Usado em careacao manual |
| IMP-010 | Linha sem numero do pedido | Linha registrada em `import_errors` e lote segue | Implementado no import-service; exige banco de teste para integracao | 0 para linha invalida | 0 | 1 | 0 | Mensagem: `Numero do pedido obrigatorio.` |
| IMP-011 | Linha sem motorista | Linha registrada em `import_errors` e lote segue | Implementado no import-service; exige banco de teste para integracao | 0 para linha invalida | 0 | 1 | 0 | Mensagem: `Motorista obrigatorio.` |
| IMP-012 | Arquivo vazio | Redireciona com erro amigavel | Teste unitario do validador passou | 0 | 0 | 0 | 0 | Erro `arquivo` |
| IMP-013 | Arquivo nao `.xlsx` | Redireciona com erro amigavel | Teste unitario do validador passou | 0 | 0 | 0 | 0 | Erro `formato` |
| IMP-014 | Arquivo acima de 8 MB | Redireciona com erro amigavel | Teste unitario do validador passou | 0 | 0 | 0 | 0 | Erro `tamanho` |
| IMP-015 | Arquivo corrompido | Lote `failed` com mensagem clara quando possivel | Implementado em `friendlyImportError`; validar manualmente | 0 | 0 | 0 | 0 | Sem stack trace para usuario |
| IMP-016 | Modelo incompativel sem coluna de pedido | Lote `failed` com `Nenhuma linha importavel encontrada` | Implementado no import-service; validar manualmente | 0 | 0 | 0 | 0 | Mensagem aparece no historico |
| IMP-017 | Careacao/desconto na planilha | Nao cria careacao automaticamente | Teste `careacao-rule.test.ts` passou | N/A | N/A | N/A | 0 | Regra oficial: cliente abre manualmente |
| IMP-018 | Grande volume | Nao deve ser presumido seguro em serverless | Nao executado nesta rodada | A validar | A validar | A validar | 0 | Para volume muito alto, propor fila/worker |

## Comandos executados

```sh
npm run test
npm run lint
npm run build
npm audit --omit=dev
npm run migrate
```

Resultados desta rodada:

- `npm run test`: 8 arquivos, 21 testes passaram.
- `npm run lint`: TypeScript sem erro.
- `npm run build`: App Router compilado com rotas esperadas.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm run migrate`: migration SQL web aplicada com sucesso.

## Pendencias de QA com banco de teste

- Importacao valida de ponta a ponta.
- Importacao duplicada de ponta a ponta.
- Registro real de `import_errors`.
- Carga controlada com arquivo maior e medicao de tempo.
- Arquivo real do cliente apos confirmacao de modelo.
