## documentação enxuta (mas completa) dividida em duas partes: **DEV (fluxo diário)** e **TECH LEAD (versionamento, RCs, QA e PROD)**.

# Visão geral rápida

- **Modelo de branches**

  - `dev` → desenvolvimento contínuo.
  - `releases/x.y.z` → estabilização para gerar RCs que vão ao **QA**.
  - `main` → produção; recebe **tags estáveis** `vX.Y.Z`.

- **Versionamento**: **SemVer** (`MAJOR.MINOR.PATCH`).

  - `vX.Y.Z-rc.N` = _release candidate_ (QA).
  - `vX.Y.Z` = versão estável (PROD).

- **Commits**: **Conventional Commits** (ex.: `feat:`, `fix:`, `perf:`, `refactor:`, `chore:`…).

---

# 1) DEV — Fluxo diário (features/bugfix/hotfix em DEV)

## Pré-requisitos

- Git configurado para git-flow com prefixos:

```bash
# Configure the standard git-flow prefixes
git flow init -d
git config gitflow.branch.master master
git config gitflow.branch.develop develop
git config gitflow.prefix.release "releases/"
git config gitflow.prefix.hotfix  "hotfix/"
git config gitflow.prefix.feature "feature/"
git config gitflow.prefix.bugfix  "bugfix/"
git config gitflow.prefix.versiontag "v"
```

- Padrão de commits: **Conventional Commits**.
- Pipelines conectadas ao repositório (Actions/Vercel).

## Criar/entregar **feature**

```bash
# Start a feature from latest dev
git checkout dev
git pull origin dev
git flow feature start HYP-123-add-search

# Work, commit often (Conventional Commits)
git add .
git commit -m "feat(search): add debounced query and empty state"

# Aqui será feito o Push da feature branch e deverá ser aberta PR para branch develop
git flow <tipo-da-branch> publish
# Open PR on GitHub → base=dev, compare=feature/HYP-123-add-search
```

## Corrigir **bug** (em DEV)

```bash
git checkout dev && git pull origin dev
git flow bugfix start HYP-456-fix-pagination
# commits...
git push -u origin bugfix/HYP-456-fix-pagination
# Open PR to dev
```

## Sincronizar sua máquina

```bash
git fetch --all --prune
git checkout dev && git pull origin dev
```

## O que **NÃO** fazer

- **Não** versionar `VERSION` nem criar tags. Isso é papel do **Tech Lead**.
- **Não** comitar diretamente em `main`, `develop` ou `releases/*`.

## Hotfix só para DEV (não PROD)

Se for correção que **não** precisa ir urgente à produção, trate como _bugfix_ normal (branch `bugfix/*` → PR para `dev`).

Se for correção urgente/chamados:
1. Criar uma branch hotfix (que será criada a partir da branch master).
2. Corrigir o problema e commitar na sua branch hotfix
3. Fazer o push para o repositório remoto com o comando `git flow hotfix publish`
4. Solicitar ao techlead que gere uma nova versão de correção do problema.
---

# 2) TECH LEAD — Versionamento, RCs, QA e PROD

## Objetivo

- Congelar uma versão da `dev`
- Estabilizar em `releases/x.y.z`
- Produzir **RCs** (`vX.Y.Z-rc.N`) para **QA**
- Quando aprovado, promover para **PROD** com a **tag estável** `vX.Y.Z` na `main`.
- Gerar **CHANGELOG** automático com base em Conventional Commits.

## Pré-requisitos

- `develop` verde (build/tests ok).
- `VERSION` atualizado com o **próximo** `X.Y.Z` que será lançado.
- Git-flow e prefixos configurados (ver bloco no início).
<!-- corrigir lógica para azure devops -->
- GitHub Actions para **RC** e, opcionalmente, **Prod** (modelos abaixo).
- Opcional: integrações de deploy (Vercel, etc.) ligadas às **tags**.

## 2.1 Criar a **release** (a partir de `dev`)

```bash
# Make sure dev is updated
git checkout dev && git pull origin dev

# Start the new release (SemVer version)
git flow release start 1.1.0

# Commit any last-minute version bump if needed
git add VERSION
git commit -m "chore(release): bump VERSION to 1.1.0"

# Publish the release branch to trigger RC automation
git push -u origin releases/1.1.0
```

> **O que acontece agora**
>
> - Sua Action **rc-on-release** (abaixo) vai gerar `v1.1.0-rc.1`.
> - A cada push na `releases/1.1.0`, ela cria `v1.1.0-rc.2`, `rc.3`…

## 2.2 Enviar RC para **QA**

- Passe ao QA a **tag** (ex.: `v1.1.0-rc.2`) e/ou o **link do deploy** dessa tag (se automatizado).
- Para ver o que mudou entre RCs:

```bash
# Show changes from rc.1 to rc.2
git log --oneline v1.1.0-rc.1..v1.1.0-rc.2
```

- Para gerar CHANGELOG cumulativo durante a release:

```bash
# Generate/refresh changelog incrementally (Angular preset)
npx -y conventional-changelog-cli -p angular -i CHANGELOG.md -s
git add CHANGELOG.md
git commit -m "chore(changelog): refresh during release 1.1.0"
git push origin HEAD
```

## 2.3 Aprovado em QA? **Finalizar** a release (promover para PROD)

```bash
# Finish will:
# - Merge releases/1.1.0 -> main
# - Tag main as v1.1.0 (annotated tag)
# - Back-merge to dev
# - Delete releases/1.1.0 branch
git flow release finish 1.1.0

# Publish everything (IMPORTANT)
git push origin main
git push origin dev
git push origin --tags
```

> **Agora** a tag `v1.1.0` está no GitHub.
> **Sugestão**: crie uma **GitHub Release** a partir desta tag e anexe o conteúdo do `CHANGELOG.md` referente à `v1.1.0`.

## 2.4 Hotfix **urgente em PROD**

Quando o problema está **em produção** e precisa sair **imediato**:

```bash
git checkout main && git pull origin main

git flow hotfix start 1.1.1
# commit(s) with fix...
git commit -m "fix(auth): null token guards for sso"

git flow hotfix finish 1.1.1
git push origin main dev --tags
```

- Isso cria a **tag estável** `v1.1.1` direto na `main` e integra o fix de volta em `dev`.

## 2.5 Rollback (se criou uma tag errada)

```bash
# Delete a wrong tag locally and remotely
git tag -d v1.1.0-rc.3
git push origin :refs/tags/v1.1.0-rc.3
```

---

## Conexão com QA/PROD via tags (sugestões de CI)

### A) **RCs** (QA) – _rc-on-release.yml_

> Dispara a cada push em `releases/**`; cria a próxima **RC tag** e atualiza o `CHANGELOG.md`.

```yaml
# .github/workflows/rc-on-release.yml
name: RC Tag from release
on:
  push:
    branches:
      - "releases/**" # <--- important: any releases/x.y.z

jobs:
  tag-rc:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Read base version
        id: ver
        run: |
          BASE=$(cat VERSION | tr -d '\n')
          echo "base=${BASE}" >> $GITHUB_OUTPUT

      - name: Compute next RC
        id: rc
        run: |
          set -euo pipefail
          BASE="${{ steps.ver.outputs.base }}"
          LAST=$(git tag -l "v${BASE}-rc.*" | sed -E 's/.*-rc\.([0-9]+)/\1/' | sort -n | tail -1)
          if [ -z "${LAST}" ]; then NEXT=1; else NEXT=$((LAST+1)); fi
          TAG="v${BASE}-rc.${NEXT}"
          echo "tag=${TAG}" >> $GITHUB_OUTPUT
          echo "Next RC will be: ${TAG}"

      - name: Create RC tag
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "${{ steps.rc.outputs.tag }}" -m "RC ${{ steps.rc.outputs.tag }} from $GITHUB_REF_NAME"
          git push origin "${{ steps.rc.outputs.tag }}"

      - name: Update CHANGELOG (incremental)
        run: |
          npx -y conventional-changelog-cli -p angular -i CHANGELOG.md -s
          git add CHANGELOG.md
          git commit -m "chore(changelog): update for ${{ steps.rc.outputs.tag }}" || true
          git push origin HEAD:${GITHUB_REF_NAME}
```

> **Deploy QA por tag**: se quiser um deploy automático de QA por **RC tag**, crie outro workflow que **escute tags** `v*-rc.*` e acione sua plataforma (ex.: Vercel CLI).

### B) **Prod** – _prod-on-tag.yml_

> Dispara quando uma **tag estável** `vX.Y.Z` é criada (`git flow release finish`).

```yaml
# .github/workflows/prod-on-tag.yml
name: Prod deploy on stable tag
on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+" # stable SemVer tags only

jobs:
  release:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      # Optional: build & attach artifacts, or call your deploy (Vercel/Azure/etc)
      - name: Generate release notes (from Conventional Commits)
        id: notes
        run: |
          npx -y conventional-changelog-cli -p angular -r 0 -o RELEASE_NOTES.md
          echo "generated=true" >> $GITHUB_OUTPUT

      - name: Publish GitHub Release
        if: steps.notes.outputs.generated == 'true'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          body_path: RELEASE_NOTES.md
```

---

## Tabelas de referência

### Convenções de nomes

| Tipo         | Padrão                    | Exemplo                        |
| ------------ | ------------------------- | ------------------------------ |
| Feature      | `feature/<ticket>-<slug>` | `feature/ECO-321-async-cache`  |
| Bugfix (DEV) | `bugfix/<ticket>-<slug>`  | `bugfix/ECO-654-broken-filter` |
| Release      | `releases/<X.Y.Z>`        | `releases/1.2.0`               |
| Hotfix       | `hotfix/<X.Y.Z>`          | `hotfix/1.2.1`                 |
| RC Tag (QA)  | `vX.Y.Z-rc.N`             | `v1.2.0-rc.3`                  |
| Prod Tag     | `vX.Y.Z`                  | `v1.2.0`                       |

### SemVer – quando mudar

- **MAJOR**: quebra de compatibilidade (breaking change).
- **MINOR**: novas features compatíveis.
- **PATCH**: correções/pequenos ajustes.

---

## Checklists

### Antes de criar uma release (`releases/X.Y.Z`)

- [ ] `dev` atualizado e verde.
- [ ] `VERSION` ajustado para `X.Y.Z`.
- [ ] PRs essenciais mesclados.
- [ ] Lint/tests ok.

### Para aprovar RC e promover a PROD

- [ ] RC implantado em QA (`vX.Y.Z-rc.N`).
- [ ] Testes funcionais/integração aprovados.
- [ ] `CHANGELOG.md` revisado.
- [ ] `git flow release finish X.Y.Z` executado.
- [ ] `git push origin main dev --tags`.

---

## Comandos de inspeção úteis

```bash
# List newest tags
git tag --sort=-creatordate | head

# Show commits included in a tag vs previous stable
git log --oneline v1.0.0..v1.1.0

# Diff between two RCs
git diff --stat v1.1.0-rc.2..v1.1.0-rc.3

# What files changed in current release branch vs dev
git diff --name-only origin/dev...HEAD
```

---

## Fluxos resumidos (cola)

### DEV (todo dia)

```bash
git checkout dev && git pull
git flow feature start HYP-123-new-widget
# commits (Conventional Commits)
git push -u origin feature/HYP-123-new-widget
# open PR -> dev
```

### TECH LEAD (release → RC → QA → PROD)

```bash
# Create release
git checkout dev && git pull
git flow release start 1.3.0
git add VERSION && git commit -m "chore(release): bump VERSION to 1.3.0"
git push -u origin releases/1.3.0     # RC automation triggers

# After QA approval
git flow release finish 1.3.0
git push origin main dev --tags       # publish stable v1.3.0
```

### HOTFIX (produção urgente)

```bash
git checkout main && git pull
git flow hotfix start 1.3.1
# commits...
git flow hotfix finish 1.3.1
git push origin main dev --tags
```

---

com isso, o time tem **dois guias independentes**:

- **DEV** sabe exatamente como trabalhar no dia a dia.
- **TECH LEAD** controla **versionamento**, **RCs**, **QA** e **produção** via tags e changelog, com rastreabilidade total do conteúdo de cada pacote.
