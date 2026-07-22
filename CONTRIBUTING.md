# Guia de Desenvolvimento

## Setup

```bash
npm install
```

- `npm run dev:backend` — sobe a API (Express)
- `npm run dev:web` — sobe o frontend (Vite)
- `npm run lint` — roda o ESLint em todos os workspaces
- `npm run format` — formata o código com Prettier

## Commits

Formato: `<tipo>(<escopo>): <descrição>`

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `chore`, `security`, `content`.

Exemplo: `feat(backend): add auth endpoints`

## Branches

`feature/*` / `fix/*` / `refactor/*` → `develop` → `staging` → `main`

## CI

Todo push/PR para `main`, `staging` e `develop` roda automaticamente:
- `test.yml` — testes (`npm test --workspaces`)
- `lint.yml` — ESLint + Prettier

Push para `staging` também dispara `deploy-staging.yml` (build do `web`; o passo de deploy real depende da escolha do provedor de hospedagem).

O pre-commit hook (Husky) roda `npm run lint` antes de cada commit local.
