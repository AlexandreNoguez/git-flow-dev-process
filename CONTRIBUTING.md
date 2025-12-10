## Fluxo de Git Flow e Pull Requests

Este repositório utiliza **Git Flow** com as branches principais:

- `main`: código em produção.
- `dev`: branch de integração (tudo passa por aqui antes de ir para `main`).

Além disso, usamos:

- `feature/*` para novas funcionalidades
- `release/*` para preparação de releases
- `hotfix/*` para correções críticas em produção

### 1. Nomenclatura de branches

Use sempre o padrão abaixo:

- **Feature**: `feature/<TICKET>-<descricao-curta>`
  - Ex: `feature/HYP-123-add-search`
- **Release**: `release/<versao>`
  - Ex: `release/1.4.0`
- **Hotfix**: `hotfix/<versao>`
  - Ex: `hotfix/1.4.1`

> A descrição curta deve ser em inglês, minúscula, separada por hífen.

### 2. Commits (Conventional Commits)

Utilizamos **Conventional Commits** para permitir geração automática de changelog.

Formato:

```text
<type>[optional scope]: <description>
```
