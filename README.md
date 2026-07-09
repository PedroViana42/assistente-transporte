# Assistente de Transporte

Aplicacao web para importar planilhas Excel de entregas, consultar pedidos e tratar careacoes em um banco PostgreSQL Neon.

## Arquitetura

A arquitetura operacional e unica:

- Next.js com App Router
- React
- API Routes e Server Actions
- PostgreSQL Neon
- Deploy na Vercel
- Relatorios Excel gerados em memoria

Nao ha dependencia operacional de Python, Streamlit, CLI local, Alembic ou Docker.

## Estrutura

```text
/
  src/app/              rotas, paginas e API Routes
  src/lib/              banco, auth, importacao, relatorios e filtros
  scripts/              scripts operacionais Node.js
  migrations/           migration SQL oficial
  docs/                 QA e documentacao de entrega
  package.json          comandos oficiais
```

## Variaveis de ambiente

Configure na Vercel e no `.env.local` local:

```env
DATABASE_URL=postgresql://usuario:senha@host-pooler.neon.tech/neondb?sslmode=require
AUTH_SECRET=uma-string-grande-e-aleatoria
ADMIN_PASSWORD_HASH=scrypt$salt$hash
```

Gere o hash da senha administrativa:

```sh
npm run hash-password
```

Use a connection string pooled do Neon quando possivel.

## Instalar

```sh
npm install
```

## Migrations

Aplicar schema e indices no Neon:

```sh
npm run migrate
```

A migration oficial esta em `migrations/001_web_manual_careacao.sql`. Ela e aditiva/idempotente quando possivel e nao apaga dados.

Rollback de schema deve ser manual e planejado, usando backup/snapshot do Neon antes de qualquer alteracao destrutiva.

## Rodar local

```sh
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Testes e build

```sh
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

## Deploy na Vercel

Configuracao:

```text
Framework Preset: Next.js
Root Directory: vazio / raiz do repositorio
Install Command: npm install
Build Command: npm run build
Output Directory: vazio / padrao
```

Variaveis obrigatorias em Production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `ADMIN_PASSWORD_HASH`

Depois de mudancas de schema:

```sh
npm run migrate
```

Deploy via CLI:

```sh
npx vercel --prod --yes
```

## Fluxo de importacao

1. Usuario faz login.
2. Envia uma planilha `.xlsx` de ate 8 MB em `/upload`.
3. A API le o Excel em memoria.
4. O sistema detecta abas e cabecalho nas primeiras linhas.
5. Colunas reconhecidas sao normalizadas.
6. Motoristas sao criados/reutilizados por nome normalizado.
7. Pedidos novos sao criados.
8. Pedidos duplicados sao ignorados.
9. Erros por linha sao salvos em `import_errors`.
10. O lote fica registrado em `import_batches`.

Careacoes nao sao criadas automaticamente a partir da planilha. O fluxo oficial e pesquisar o pedido e abrir a careacao manualmente.

## Fluxo de careacoes

1. Pesquise o pedido em `/pedidos`.
2. Abra a careacao informando valor, culpa do cliente, motivo e observacao.
3. Acompanhe em `/careacoes`.
4. Use filtros por pedido, status, motorista e periodo.
5. Ao abrir um caso, os filtros da listagem sao preservados no botao Voltar.
6. Alteracoes sao registradas em `careacao_history`.
7. Resolver ou cancelar exige confirmacao explicita.
8. O relatorio filtrado pode ser exportado da tela de careacoes.

## Relatorios

`/relatorios` gera Excel em memoria com:

- Completo
- Pedidos
- Resumo por motorista
- Careacoes

A tela `/careacoes` tambem exporta careacoes respeitando os filtros aplicados.

## Limitacoes do MVP

- Autenticacao por senha unica administrativa.
- Sem usuarios individuais ou trilha por operador.
- Upload serverless limitado a 8 MB.
- Arquivos enviados nao sao armazenados permanentemente.
- Planilhas muito grandes podem exigir fila ou worker externo fora da Vercel.
- Fora do escopo atual: WhatsApp, IA, OCR e portal publico.
