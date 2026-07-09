# QA Diagnostico Inicial

Data: 2026-07-09

## 1. Estado encontrado antes da consolidacao

O repositorio tinha duas arquiteturas operacionais:

- Aplicacao local Python para importacao, painel Streamlit, CLI, SQLAlchemy e Alembic.
- Aplicacao web Next.js em subpasta para Vercel.

Esse desenho causava risco real de deploy incorreto, duplicidade de regras e manutencao mais dificil.

## 2. Problemas identificados

| ID | Severidade | Problema | Causa provavel | Status atual |
| -- | ---------- | -------- | -------------- | ------------ |
| QA-001 | Bloqueador | Vercel podia executar a aplicacao errada | Web ficava em subpasta e Python na raiz | Corrigido |
| QA-002 | Critico | Upload XLSX podia gerar 500 | Parser anterior nao era robusto para planilha real | Corrigido |
| QA-003 | Alto | Arquivo sem cabecalho reconhecido podia ficar confuso | Cabecalho nem sempre esta na primeira linha | Corrigido |
| QA-004 | Medio | Sem testes automatizados web | Nao havia runner de testes Next.js | Corrigido com Vitest |
| QA-005 | Medio | Sem paginacao real em careacoes | Lista limitada sem total/pagina | Corrigido |
| QA-006 | Medio | Sem historico de alteracoes | Apenas estado atual era salvo | Corrigido |
| QA-007 | Medio | Relatorio filtrado ausente | Exportacao era geral | Corrigido |
| QA-008 | Medio | Sem confirmacao para resolver/cancelar | Formulario salvava direto | Corrigido |

## 3. Estado consolidado

- Aplicacao operacional unica em Next.js na raiz.
- Migrations oficiais em SQL.
- Banco Neon acessado via `pg`.
- Upload e relatorios sem filesystem persistente.
- Careacoes manuais, com historico e confirmacao para status final.
- Testes unitarios web configurados.
- Python local removido do controle do Git.

## 4. Fluxo atual

1. Usuario acessa a aplicacao e faz login.
2. Dashboard consulta indicadores no Neon.
3. Upload envia `.xlsx` para `/api/upload`.
4. Importador le abas em memoria, detecta cabecalho, normaliza dados e grava pedidos.
5. Duplicidades sao ignoradas.
6. Erros por linha sao salvos.
7. Usuario pesquisa pedido e abre careacao manualmente.
8. Usuario acompanha careacoes com filtros, busca, paginacao e exportacao filtrada.
9. Detalhe da careacao registra historico de alteracoes.

## 5. Dependencias principais

- Next.js
- React
- pg
- exceljs
- jszip
- fast-xml-parser
- dotenv
- Vitest
- TypeScript

## 6. Riscos restantes

- Arquivos muito grandes podem ultrapassar limites serverless.
- Falta teste end-to-end com Playwright.
- Falta banco de teste dedicado para integracao automatizada.
- Autenticacao ainda e senha unica administrativa.

## 7. Validacoes executadas

```sh
npm install
npm run test
npm run lint
npm run build
npm audit --omit=dev
npm run migrate
```

Resultados:

- Testes passaram.
- TypeScript passou.
- Build App Router passou.
- Audit sem vulnerabilidades.
- Migration SQL aplicada com sucesso.
