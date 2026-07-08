# Assistente de Transporte Web

Versao para Vercel do fluxo de careacao manual.

## O que esta versao faz

- Login simples por senha
- Resumo dos pedidos e careacoes
- Upload de planilha Excel `.xlsx`
- Historico de importacoes e erros de linha
- Pesquisa pedido ja importado no Neon
- Abre careacao manualmente
- Salva valor, culpa do cliente, motivo, observacao e resposta do motorista em `careacao_cases`
- Lista e filtra careacoes
- Exporta relatorios Excel

## O que ela nao faz nesta fase

- Nao le careacao/desconto da planilha
- Nao expoe a senha do Neon no navegador

## Variaveis de ambiente da Vercel

Configure no projeto:

```env
DATABASE_URL=postgresql://usuario:senha@host-pooler.neon.tech/neondb?sslmode=require
AUTH_SECRET=uma-string-grande-e-aleatoria
ADMIN_PASSWORD_HASH=scrypt:salt:hash
```

Gere a senha com:

```sh
npm run hash-password
```

Use a connection string pooled do Neon sempre que possivel.

## Rodar local

```sh
npm install
npm run migrate
npm run dev
```

## Deploy

Na Vercel, a raiz do projeto deve ser esta pasta:

```text
web_vercel
```

Depois do deploy, rode a migration uma vez:

```sh
npm run migrate
```
