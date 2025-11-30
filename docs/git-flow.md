# Guia de Fluxo Git-Flow + RCs + QA/PROD (com comentários em PT-BR)

Documentação enxuta (mas completa) dividida em duas partes: **DEV (fluxo diário)** e **TECH LEAD (versionamento, RCs, QA e PROD)**.
Modela branches, versionamento **SemVer (`Semantic Version x.y.z`)**, geração de **RCs (`vX.Y.Z-rc.N`)** e **tag estável (`vX.Y.Z`)**.

---

## Visão geral

- **Modelo de branches**

  - `develop` → desenvolvimento contínuo (ambiente DEV).
  - `release/x.y.z` → estabilização para gerar RCs que vão ao **QA**.
  - `master` → produção; recebe **tags estáveis** `vX.Y.Z`.

- **Versionamento:** **SemVer** (`MAJOR.MINOR.PATCH`)

  - `vX.Y.Z-rc.N` = _release candidate_ (QA).
  - `vX.Y.Z` = versão estável (PROD).

- **Commits:** **Conventional Commits** (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, etc.).

---

# 1) DEV — Fluxo diário (features/bugfix/hotfix em DEV)

## Pré-requisitos

- Git-flow configurado com seus **nomes reais** de branches:

```bash
# Inicializa git-flow com defaults
git flow init -d

# Ajusta mapeamentos para seu naming
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

## Criar/entregar **feature**

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

## Corrigir **bug** (em DEV)

```bash
git checkout develop && git pull origin develop
git flow bugfix start HYP-456-fix-pagination
# commits...
git push -u origin bugfix/HYP-456-fix-pagination
# Abrir PR -> develop
```

## Sincronizar máquina

```bash
git fetch --all --prune
git checkout develop && git pull origin develop
```

## O que **NÃO** fazer

- **Não** alterar `package.json.version` nem criar tags. Isso é papel do **Tech Lead** na _branch de release_.
- **Não** comitar diretamente em `master`, `develop` ou `release/*`.

## Hotfix só para DEV (não PROD)

Se a correção **não** precisa ir urgente para produção, trate como **bugfix** normal (`bugfix/*` → PR para `develop`).

Se for correção **urgente** (incidente):

1. Tech Lead cria `hotfix/x.y.z` a partir de `master`.
2. Você commita nele.
3. `git flow hotfix publish`.
4. Tech Lead finaliza hotfix para gerar a versão de correção.

---

# 2) TECH LEAD — Versionamento, RCs, QA e PROD

## Objetivo

- Congelar versão da `develop`.
- Estabilizar em `release/x.y.z`.
- Produzir **RCs** (`vX.Y.Z-rc.N`) para **QA**.
- Aprovado? Promover a **PROD** com **tag estável** `vX.Y.Z` na `master`.
- Gerar **CHANGELOG** automático (Conventional Commits).

## Pré-requisitos

- `develop` verde (build/tests ok).
- **`package.json.version`** ajustado na branch de release para o **próximo** `X.Y.Z`.
- Git-flow e prefixos configurados.
- GitHub Actions para **RC** e, opcionalmente, **Prod** (modelos abaixo).
- Opcional: deploys (Vercel/Azure/etc.) ligados às **tags**.

## 2.1 Criar a **release** (a partir de `develop`)

```bash
# Garantir develop atualizada
git checkout develop && git pull origin develop

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

> **O que acontece agora**
>
> - O workflow **rc-on-release** (abaixo) cria `v1.4.0-rc.1`.
> - Cada push em `release/1.4.0` cria `v1.4.0-rc.2`, `rc.3`…

## 2.2 Enviar RC para **QA**

- Entregar ao QA a **tag** (ex.: `v1.4.0-rc.2`) e/ou o **link do deploy** dessa tag.
- Para ver diferenças entre RCs:

```bash
git log --oneline v1.4.0-rc.1..v1.4.0-rc.2
```

- Para gerar CHANGELOG cumulativo durante a release:

```bash
npx -y conventional-changelog-cli -p angular -i CHANGELOG.md -s
git add CHANGELOG.md
git commit -m "chore(changelog): refresh during release 1.4.0"
git push origin HEAD
```

## 2.3 Aprovado em QA? **Finalizar** a release (promover para PROD)

<!-- ```bash
# Gerar notas desta versão (entre última tag e HEAD)
NOTES=$(mktemp)
npx -y conventional-changelog-cli -p angular -r 1 > "$NOTES"

# Finalizar a release já preenchendo a mensagem da TAG
git flow release finish -m "$(cat "$NOTES")" 1.4.0

# Publicar
git push origin master develop --tags
``` -->

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

> **Agora** a tag estável `v1.4.0` está no GitHub.
> Sugestão: crie uma **GitHub Release** a partir desta tag e anexe o trecho do `CHANGELOG.md` correspondente.

## 2.4 Hotfix **urgente em PROD**

```bash
git checkout master && git pull origin master

git flow hotfix start 1.4.1
# commits do fix...
git commit -m "fix(auth): null token guards for sso"

git flow hotfix finish 1.4.1
git push origin master develop --tags
```

- Cria a **tag estável** `v1.4.1` direto na `master` e integra o fix em `develop`.

## 2.5 Rollback (se criou uma tag errada)

```bash
# Apaga tag local e remota
git tag -d v1.4.0-rc.3
git push origin :refs/tags/v1.4.0-rc.3
```

---

## CI por tags — exemplos de workflows

### A) **RCs (QA)** — `.github/workflows/rc-on-release.yml`

> Dispara a cada push em `release/**`; cria a **próxima RC** e atualiza o `CHANGELOG.md`.
> **Lê a versão base do `package.json`** (ex.: `1.4.0`) e numera `-rc.N`.

```yaml
# .github/workflows/rc-on-release.yml
name: RC Tag from release

on:
  push:
    branches:
      - "release/**" # qualquer release/x.y.z (prefixo git-flow)

jobs:
  tag-rc:
    # Evita RCs duplicadas em pushes simultâneos na MESMA release
    concurrency:
      group: rc-${{ github.ref }}
      cancel-in-progress: false

    permissions:
      contents: write

    runs-on: ubuntu-latest

    steps:
      # Checkout com histórico completo (precisamos ver tags anteriores)
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      # Guarda de segurança: só segue se for release/*
      - name: Guard (somente em release/*)
        run: |
          case "${GITHUB_REF_NAME}" in
            release/*) echo "OK: ${GITHUB_REF_NAME}";;
            *) echo "Este workflow só deve rodar em release/*"; exit 1;;
          esac

      # Lê a versão base do package.json (ex.: 1.4.0)
      - name: Ler versão base do package.json
        id: ver
        run: |
          BASE=$(node -p "require('./package.json').version")
          echo "base=${BASE}" >> $GITHUB_OUTPUT
          echo "Versão base: ${BASE}"

      # Calcula o próximo RC com base nas tags existentes vX.Y.Z-rc.N
      - name: Calcular próximo RC
        id: rc
        run: |
          set -euo pipefail
          BASE="${{ steps.ver.outputs.base }}"
          LAST=$(git tag -l "v${BASE}-rc.*" | sed -E 's/.*-rc\.([0-9]+)/\1/' | sort -n | tail -1)
          if [ -z "${LAST}" ]; then NEXT=1; else NEXT=$((LAST+1)); fi
          TAG="v${BASE}-rc.${NEXT}"
          echo "tag=${TAG}" >> $GITHUB_OUTPUT
          echo "Próxima RC: ${TAG}"

      # Cria a tag anotada do RC e envia ao GitHub
      - name: Criar tag RC
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "${{ steps.rc.outputs.tag }}" -m "RC ${{ steps.rc.outputs.tag }} a partir de ${GITHUB_REF_NAME}"
          git push origin "${{ steps.rc.outputs.tag }}"

      # Atualiza CHANGELOG incrementalmente (padrão Angular)
      - name: Atualizar CHANGELOG (incremental)
        run: |
          npx -y conventional-changelog-cli -p angular -i CHANGELOG.md -s
          git add CHANGELOG.md
          git commit -m "chore(changelog): update for ${{ steps.rc.outputs.tag }}" || true
          git push origin HEAD:${GITHUB_REF_NAME}
```

> **Deploy QA por tag:** se quiser deploy automático em QA por **RC tag**, crie outro workflow que **escute tags** `v*-rc.*` e chame sua plataforma de deploy (ex.: Vercel CLI com `vercel --prod --token ...`).

---

### B) **Prod** — `.github/workflows/prod-on-tag.yml`

> Dispara quando uma **tag estável** `vX.Y.Z` é criada (`git flow release finish`).

```yaml
# .github/workflows/prod-on-tag.yml
name: Prod deploy on stable tag

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+" # apenas tags estáveis SemVer

jobs:
  release:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      # (Opcional) Build/publicação do app / artefatos / deploy para PROD
      # Ex.: chamar Vercel/Infra/Helm/etc.

      # Gera notas a partir de Conventional Commits
      - name: Gerar release notes
        id: notes
        run: |
          npx -y conventional-changelog-cli -p angular -r 0 -o RELEASE_NOTES.md
          echo "generated=true" >> $GITHUB_OUTPUT

      # Publica GitHub Release com as notas
      - name: Publicar GitHub Release
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
| Release      | `release/<X.Y.Z>`         | `release/1.4.0`                |
| Hotfix       | `hotfix/<X.Y.Z>`          | `hotfix/1.4.1`                 |
| RC Tag (QA)  | `vX.Y.Z-rc.N`             | `v1.4.0-rc.3`                  |
| Prod Tag     | `vX.Y.Z`                  | `v1.4.0`                       |

### SemVer — quando mudar

- **MAJOR**: quebrar compatibilidade (breaking changes).
- **MINOR**: novas features compatíveis.
- **PATCH**: correções/pequenos ajustes.

---

## Checklists

### Antes de criar uma release (`release/X.Y.Z`)

- [ ] `develop` atualizada e verde.
- [ ] **`package.json.version = X.Y.Z`** (ajustado na branch de release).
- [ ] PRs essenciais mesclados.
- [ ] Lint/tests ok.

### Para aprovar RC e promover a PROD

- [ ] RC implantado e testado em QA (`vX.Y.Z-rc.N`).
- [ ] Testes funcionais/integração aprovados.
- [ ] `CHANGELOG.md` revisado.
- [ ] `git flow release finish X.Y.Z` executado.
- [ ] `git push origin master develop --tags` concluído.

---

## Comandos de inspeção úteis

```bash
# Últimas tags (mais novas primeiro)
git tag --sort=-creatordate | head

# Commits incluídos entre duas versões estáveis
git log --oneline v1.3.0..v1.4.0

# Diff entre dois RCs
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
git flow feature publish HYP-123-new-widget
# abrir PR -> develop
```

### TECH LEAD (release → RC → QA → PROD)

```bash
# Criar release
git checkout develop && git pull
git flow release start 1.4.0
npm version --no-git-tag-version 1.4.0
git add package.json package-lock.json 2>/dev/null || true
git commit -m "chore(release): set package.json version to 1.4.0"
git push -u origin release/1.4.0     # dispara automação de RC

# Aprovado em QA
git flow release finish 1.4.0
git push origin master develop --tags   # publica tag estável v1.4.0
```

### HOTFIX (produção urgente)

```bash
git checkout master && git pull
git flow hotfix start 1.4.1
# ... commits ...
git flow hotfix finish 1.4.1
git push origin master develop --tags
```

---

Com isso:

- **DEV** tem um passo-a-passo claro do dia a dia.
- **TECH LEAD** controla **versionamento**, **RCs**, **QA** e **PROD** via tags e changelog, mantendo rastreabilidade de “o que entrou em cada pacote”.
