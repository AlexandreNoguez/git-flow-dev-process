# Guia de Fluxo Git-Flow + RCs + QA/PROD (comentado em PT-BR)

Documentação enxuta (mas completa) dividida em duas partes: **DEV (fluxo diário)** e **TECH LEAD (versionamento, RCs, QA e PROD)**.
Modelo de branches, versionamento **SemVer (`x.y.z`)**, geração de **RCs (`vX.Y.Z-rc.N`)** e **tag estável (`vX.Y.Z`)**.

---

## Visão Geral

- **Modelo de branches**

  - `develop` → desenvolvimento contínuo (ambiente **DEV**).
  - `release/x.y.z` → estabilização da versão; gera **RCs** (vai para **QA**).
  - `master` → produção; recebe **tags estáveis** `vX.Y.Z`.

- **Versionamento:** **SemVer**
  `MAJOR.MINOR.PATCH`
  `vX.Y.Z-rc.N` = _release candidate_ (QA) · `vX.Y.Z` = versão estável (PROD).

- **Commits:** **Conventional Commits** (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, etc.).

---

# 1) DEV — fluxo diário (features/bugfix/hotfix em DEV)

## Pré-requisitos

- Git-flow com **seus nomes reais** de branches:

```bash
# Inicializa git-flow com defaults
git flow init

# Ajusta mapeamentos para o naming adotado
git config gitflow.branch.master master
git config gitflow.branch.develop develop

# Prefixos
git config gitflow.prefix.release "release/"   # cria release/1.2.3
git config gitflow.prefix.hotfix  "hotfix/"
git config gitflow.prefix.feature "feature/"
git config gitflow.prefix.bugfix  "bugfix/"
git config gitflow.prefix.versiontag "v"
```

- Padrão de commits: **Conventional Commits**.
- Pipelines conectadas (GitHub Actions/Vercel/etc.).

## Feature

```bash
# Sempre parta da develop atualizada
git checkout develop
git pull

# Inicia a feature
git flow feature start HYP-123-add-search

# Trabalhe e faça commits semânticos
git add .
git commit -m "feat(search): add debounced query and empty state"

# Publica a feature e abre PR -> develop
git flow feature publish
# Abrir PR no GitHub: base=develop, compare=feature/HYP-123-add-search
```

## Bugfix (em DEV)

```bash
git checkout develop && git pull origin develop
git flow bugfix start HYP-456-fix-pagination
# ... commits ...
git flow bugfix publish
# Abrir PR -> develop
```

## Sincronização rápida

**caso acuse divergência na develop pode tentar os seguintes comandos**:

```bash
git fetch --all --prune
git checkout develop && git pull --ff-only origin develop
```

## O que **NÃO** fazer

- **Não** alterar `package.json.version` nem criar tags — isso é do **Tech Lead** na _branch de release_.
- **Não** comitar diretamente em `master`, `develop` ou `release/*`.

## Hotfix que **não** vai para PROD

Trate como **bugfix** normal (`bugfix/*` → PR para `develop`).
Para incidente **urgente em PROD**, ver seção **Hotfix** do Tech Lead.

---

# 2) TECH LEAD — versionamento, RCs, QA e PROD

## Objetivo

- Congelar a `develop`.
- Estabilizar em `release/x.y.z`.
- Produzir **RCs** (`vX.Y.Z-rc.N`) para **QA**.
- Aprovado? **Finalizar** e marcar **tag estável** `vX.Y.Z` em `master`.
- Gerar **Release Notes/CHANGELOG** a partir dos **Conventional Commits**.

## Pré-requisitos

- `develop` **verde** (build/tests ok).
- **`package.json.version`** ajustado **na branch de release** para o **próximo** `X.Y.Z`.
- Git-flow e prefixos configurados.
- Workflows do GitHub para **RC** e, opcionalmente, **PROD** (abaixo).
- (Opcional) deploys por **tag** (Vercel/Azure/etc).

## 2.1 Criar a **release** (a partir de `develop`)

```bash
# Garantir develop atualizada
git checkout develop && git pull --ff-only origin develop

# Iniciar a nova release (SemVer)
git flow release start 1.4.0
# Agora você está em release/1.4.0

# Ajustar a versão base do projeto na branch de release
npm version --no-git-tag-version 1.4.0
git add package.json package-lock.json 2>/dev/null || true
git commit -m "chore(release): set package.json version to 1.4.0"

# Publicar a branch de release (aciona workflow de RC)
git push -u origin release/1.4.0
```

> **Automação:** o workflow **rc-on-release** (abaixo) criará `v1.4.0-rc.1`.
> A cada push na `release/1.4.0`, gera `v1.4.0-rc.2`, `rc.3`…

## 2.2 Enviar RC para **QA**

- Entregar ao QA a **tag** (ex.: `v1.4.0-rc.2`) e/ou o **link de deploy** dessa tag.
- Ver diferenças entre RCs:

```bash
git log --oneline v1.4.0-rc.1..v1.4.0-rc.2
```

## 2.3 **Finalizar** a release (promover a PROD)

> **Antes** do `finish`, garanta que **tudo local** está **em fast-forward** com o remoto para evitar “divergences”.

```bash
# Anti-divergência (passo rápido e seguro)
git fetch --all --prune

git checkout master   && git pull --ff-only origin master
git checkout develop  && git pull --ff-only origin develop
git checkout release/1.4.0 && git pull --ff-only origin release/1.4.0
```

Agora finalize:

```bash
# O finish vai:
# - Merge release/1.4.0 -> master
# - Tag master como v1.4.0 (annotated tag)
# - Back-merge para develop
# - Deletar release/1.4.0
git flow release finish 1.4.0

# Publicar tudo
git push origin master
git push origin develop
git push origin --tags
```

> **Dica:** se quiser preencher a **mensagem da tag** com notas automáticas:
>
> ```bash
> NOTES=$(mktemp)
> npx -y conventional-changelog-cli -p angular -r 1 > "$NOTES"
> git flow release finish -m "$(cat "$NOTES")" 1.4.0
> ```

## 2.4 Hotfix **urgente em PROD**

```bash
git checkout master && git pull --ff-only origin master

git flow hotfix start 1.4.1
# ... commits do fix ...
git flow hotfix finish 1.4.1
git push origin master develop --tags
```

## 2.5 Rollback de tag

```bash
# Remove a tag local e remota
git tag -d v1.4.0-rc.3
git push origin :refs/tags/v1.4.0-rc.3
```

---

## CI por tags — **Workflows prontos**

> **Importante:** para evitar “divergence” no `finish`, **não** comitamos `CHANGELOG.md` automaticamente no RC.
> Em RC: **apenas** criamos a **tag**.
> Em tag **estável**, geramos **Release Notes** (sem tocar no repo).

### A) **RCs (QA)** — `.github/workflows/rc-on-release.yml`

```yaml
# Gera a próxima tag RC (vX.Y.Z-rc.N) ao atualizar release/*
name: RC Tag from release

on:
  push:
    branches:
      - "release/**" # qualquer release/x.y.z
    paths-ignore:
      - "CHANGELOG.md" # evita loop em caso de commits manuais
      - ".tmp/**"

jobs:
  tag-rc:
    concurrency:
      group: rc-${{ github.ref }} # 1 pipeline por release
      cancel-in-progress: false
    permissions:
      contents: write
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 } # histórico completo para ver tags

      - name: Guard (somente em release/*)
        shell: bash
        run: |
          case "${GITHUB_REF_NAME}" in
            release/*) echo "OK: ${GITHUB_REF_NAME}";;
            *) echo "Este workflow só deve rodar em release/*"; exit 1;;
          esac

      - name: Ler versão base do package.json
        id: ver
        shell: bash
        run: |
          BASE=$(node -p "require('./package.json').version")
          echo "base=${BASE}" >> $GITHUB_OUTPUT

      - name: Calcular próximo RC
        id: rc
        shell: bash
        run: |
          set -eo pipefail
          BASE="${{ steps.ver.outputs.base }}"
          TAGS="$(git tag -l "v${BASE}-rc.[0-9]*" || true)"
          if [ -z "$TAGS" ]; then LAST=0
          else LAST="$(printf '%s\n' "$TAGS" | sed -E 's/.*-rc\.([0-9]+)$/\1/' | sort -n | tail -1)"; fi
          NEXT=$((LAST + 1))
          echo "tag=v${BASE}-rc.${NEXT}" >> $GITHUB_OUTPUT

      - name: Criar tag RC (anotada)
        shell: bash
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "${{ steps.rc.outputs.tag }}" -m "RC ${{ steps.rc.outputs.tag }} a partir de ${GITHUB_REF_NAME}"
          git push origin "${{ steps.rc.outputs.tag }}"
```

> **Se quiser “pré-release” no GitHub** (página de Release) para cada RC, crie um workflow opcional que **escute tags** `v*-rc.*` e publique uma Release **prerelease** com notas automáticas.

### B) **Pré-release no GitHub para RC** — `.github/workflows/qa-on-tag.yml` (opcional)

```yaml
# Cria uma GitHub Release "pre-release" toda vez que uma tag RC é criada
name: pre-release on RC tag

on:
  push:
    tags:
      - "v*-rc.*" # qualquer vX.Y.Z-rc.N

jobs:
  prerelease:
    permissions: { contents: write }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      # Gera notas só desde a última tag
      - name: Gerar notas desta RC
        run: npx -y conventional-changelog-cli -p angular -r 1 > RC_NOTES.md

      - name: Publicar GitHub Release (pre-release)
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }} (QA)
          body_path: RC_NOTES.md
          prerelease: true
```

### C) **PROD** — `.github/workflows/prod-on-tag.yml`

```yaml
# Dispara quando uma tag estável vX.Y.Z é criada (finish)
name: Prod deploy on stable tag

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+" # somente estáveis

jobs:
  release:
    permissions: { contents: write }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      # (Opcional) Build/deploy para PROD aqui
      # ex.: vercel --prod, helm upgrade, etc.

      - name: Gerar Release Notes (Conventional Commits)
        run: npx -y conventional-changelog-cli -p angular -r 0 -o RELEASE_NOTES.md

      - name: Publicar GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          body_path: RELEASE_NOTES.md
```

---

## Convenções de nomes

| Tipo         | Padrão                    | Exemplo                        |
| ------------ | ------------------------- | ------------------------------ |
| Feature      | `feature/<ticket>-<slug>` | `feature/ECO-321-async-cache`  |
| Bugfix (DEV) | `bugfix/<ticket>-<slug>`  | `bugfix/ECO-654-broken-filter` |
| Release      | `release/<X.Y.Z>`         | `release/1.4.0`                |
| Hotfix       | `hotfix/<X.Y.Z>`          | `hotfix/1.4.1`                 |
| RC Tag (QA)  | `vX.Y.Z-rc.N`             | `v1.4.0-rc.3`                  |
| Prod Tag     | `vX.Y.Z`                  | `v1.4.0`                       |

### SemVer — quando mudar

- **MAJOR**: quebra de compatibilidade.
- **MINOR**: novas features compatíveis.
- **PATCH**: correções e pequenos ajustes.

---

## Checklists

### Antes de criar `release/X.Y.Z`

- [ ] `develop` atualizada e verde.
- [ ] **`package.json.version = X.Y.Z`** (na **release**).
- [ ] PRs essenciais mesclados.
- [ ] Lint/tests ok.

### Para aprovar RC e promover a PROD

- [ ] RC implantado e testado em QA (`vX.Y.Z-rc.N`).
- [ ] Testes funcionais/integração aprovados.
- [ ] Notas conferidas (Release Notes/CHANGELOG).
- [ ] Anti-divergência executado (`pull --ff-only` em `master`, `develop`, `release/*`).
- [ ] `git flow release finish X.Y.Z` executado.
- [ ] `git push origin master develop --tags` concluído.

---

## Comandos de inspeção úteis

```bash
# Últimas tags (mais novas primeiro)
git tag --sort=-creatordate | head

# Commits entre versões estáveis
git log --oneline v1.3.0..v1.4.0

# Diff entre RCs
git diff --stat v1.4.0-rc.2..v1.4.0-rc.3

# O que mudou na release atual vs develop
git diff --name-only origin/develop...HEAD
```

---

## Fluxos resumidos (cola)

### DEV (todo dia)

```bash
git checkout develop && git pull
git flow feature start HYP-123-new-widget
# ... commits semânticos ...
git flow feature publish
# abrir PR -> develop
```

### TECH LEAD (release → RC → QA → PROD)

```bash
# Criar release
git checkout develop && git pull --ff-only
git flow release start 1.4.0
npm version --no-git-tag-version 1.4.0
git add package.json package-lock.json 2>/dev/null || true
git commit -m "chore(release): set package.json version to 1.4.0"
git push -u origin release/1.4.0     # dispara automação de RC

# Aprovado em QA → finalize com anti-divergência
git fetch --all --prune
git checkout master  && git pull --ff-only origin master
git checkout develop && git pull --ff-only origin develop
git checkout release/1.4.0 && git pull --ff-only origin release/1.4.0
git flow release finish 1.4.0
git push origin master develop --tags
```

### HOTFIX (produção urgente)

```bash
git checkout master && git pull --ff-only
git flow hotfix start 1.4.1
# ... commits ...
git flow hotfix finish 1.4.1
git push origin master develop --tags
```

---

Com isso:

- **DEV** tem um roteiro simples e repetível para o dia a dia.
- **TECH LEAD** controla **versionamento**, **RCs**, **QA** e **PROD** por **tags**, com notas/relatórios automáticos — e sem travar o `finish` por divergências.
