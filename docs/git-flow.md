# Guia de Fluxo Git-Flow + RCs + QA/PROD (comentado)

Documentação enxuta (mas completa) dividida em **DEV (fluxo diário)** e **TECH LEAD (versionamento, RCs, QA e PROD)**.
Modelo de branches, versionamento **SemVer (`x.y.z`)**, geração de **RCs (`vX.Y.Z-rc.N`)** e **tag estável (`vX.Y.Z`)**.

---

## Visão Geral

* **Modelo de branches**

  * `develop` → desenvolvimento contínuo (ambiente DEV).
  * `releases/x.y.z` → estabilização para gerar RCs que vão ao **QA**.
  * `master` → produção; recebe **tags estáveis** `vX.Y.Z`.

* **Versionamento:** **SemVer** (`MAJOR.MINOR.PATCH`)

  * `vX.Y.Z-rc.N` = *release candidate* (QA).
  * `vX.Y.Z` = versão estável (PROD).

* **Commits:** **Conventional Commits** (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, etc.).

  > *Observação:* Commits com prefixos convencionais são essenciais para um changelog útil.

---

# 1) DEV — fluxo diário (features/bugfix em DEV)

## Pré-requisitos (Git-Flow)

```bash
# Inicializa o git-flow
git flow init -d

# Mapeia branches adotadas no TRABALHO
git config gitflow.branch.develop develop
git config gitflow.branch.master  master

# Prefixos (padronize para releases/)
git config gitflow.prefix.release    "releases/"
git config gitflow.prefix.hotfix     "hotfix/"
git config gitflow.prefix.feature    "feature/"
git config gitflow.prefix.bugfix     "bugfix/"
git config gitflow.prefix.versiontag "v"
```

> Dica: ver a config atual
> `git config --get gitflow.branch.develop`
> `git config --get gitflow.branch.master`
> `git config --get gitflow.prefix.release`

## Feature

```bash
# Sempre parta da develop atualizada
git checkout develop && git pull

# Inicia a feature (utilize ECO-idTask-nome-da-branch)
git flow feature start ECO-123-add-search

# Trabalhe e faça commits semânticos
git add .
git commit -m "feat(search): add debounced query and empty state"

# Publica e abre PR -> develop
git flow feature publish
# abrir PR no GitHub: base=develop, compare=feature/HYP-123-add-search
```

## Bugfix (em DEV)

```bash
git checkout develop && git pull
git flow bugfix start HYP-456-fix-pagination
# ... commits ...
git flow bugfix publish
# abrir PR -> develop
```

## O que **NÃO** fazer

* **Não** alterar `package.json.version` nem criar tags. Isso é papel do **Tech Lead** na *branch de release*.
* **Não** commitar diretamente em `master`, `develop` ou `releases/*`.

---

# 2) TECH LEAD — versionamento, RCs, QA e PROD

## Objetivo

* Congelar versão da `develop`.
* Estabilizar em `releases/x.y.z`.
* Produzir **RCs** (`vX.Y.Z-rc.N`) para **QA** (sem tocar no repo).
* Aprovado? Promover a **PROD** com **tag estável** `vX.Y.Z` na `master`.
* Publicar **Release Notes** automáticas (Conventional Commits), sem causar divergência.

## Pré-requisitos

* `develop` verde (build/tests ok).
* **`package.json.version`** ajustado **na branch de release** para `X.Y.Z`.
* Workflows GitHub Actions configurados (RC / PROD).
* *Opcional:* Deploys (Vercel/Azure/etc.) ligados às **tags**.

---

## 2.1 Workflows (CI por tags)

### A) RCs (QA) — `.github/workflows/rc-on-release.yml`

> **Gera a próxima tag RC** (vX.Y.Z-rc.N) quando houver push em `releases/**`.
> **Importante:** não comita CHANGELOG no RC (evita divergência no `finish`).

```yaml
name: RC Tag from releases
on:
  push:
    branches:
      - "releases/**"
    paths-ignore:
      - "CHANGELOG.md"
      - ".tmp/**"

jobs:
  tag-rc:
    concurrency:
      group: rc-${{ github.ref }}   # 1 pipeline por release
      cancel-in-progress: false
    permissions:
      contents: write
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # histórico completo p/ localizar tags
          fetch-tags: true

      - name: Guard (somente em releases/*)
        shell: bash
        run: |
          case "${GITHUB_REF_NAME}" in
            releases/*) echo "OK: ${GITHUB_REF_NAME}";;
            *) echo "Este workflow só deve rodar em releases/*"; exit 1;;
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

> *Se quiser deploy automático em QA por **RC tag**, crie outro workflow que **escute tags** `v*-rc.*` e acione sua plataforma.*

---

### B) PROD (estável) — `.github/workflows/prod-on-tag.yml`

> **Dispara na tag estável** `vX.Y.Z` (criada no `finish`).
> Usa uma estratégia **robusta** para Release Notes:
>
> 1. Se a tag tiver **mensagem** (vinda de `git flow release finish -m`), usa ela;
> 2. Senão, **ignora RCs** e recorta notas do estável anterior → atual;
> 3. Fallback: changelog completo.

```yaml
name: Prod deploy on stable tag
on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+"  # apenas SemVer estável

jobs:
  release:
    permissions: { contents: write }
    runs-on: ubuntu-latest
    concurrency:
      group: prod-${{ github.ref }}
      cancel-in-progress: false

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags:  true

      - uses: actions/setup-node@v4
        with: { node-version: "20" }

      # 1) Tenta usar a MENSAGEM da tag (se você passou -m no finish)
      - name: Tentar usar mensagem da tag
        id: tagmsg
        shell: bash
        run: |
          set -euo pipefail
          CURRENT="${GITHUB_REF_NAME}"
          MSG="$(git for-each-ref "refs/tags/${CURRENT}" --format="%(contents)")" || true
          if [ -n "${MSG:-}" ]; then
            printf "%s" "$MSG" > RELEASE_NOTES.md
            echo "used=tag-message" >> $GITHUB_OUTPUT
          else
            echo "used=none" >> $GITHUB_OUTPUT
          fi

      # 2) Se não houver mensagem, gerar notas ignorando RCs (estável anterior -> atual)
      - name: Gerar notas (ignorar RCs)
        if: steps.tagmsg.outputs.used == 'none'
        shell: bash
        run: |
          set -euo pipefail
          CURRENT="${GITHUB_REF_NAME}"
          # lista estáveis (sem -rc)
          STABLES="$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname)"
          CUR_LINE="$(printf '%s\n' "$STABLES" | sed -n "1p")"    # vX.Y.Z atual
          PREV_LINE="$(printf '%s\n' "$STABLES" | sed -n "2p")"   # vA.B.C anterior
          # tenta recortar a seção do changelog só para a CURRENT
          npx -y conventional-changelog-cli -p angular -r 2 > ALL_NOTES.md || true
          awk "/^## \\[?${CURRENT#v}\\]?/ {flag=1; print; next} /^## \\[?${PREV_LINE#v}\\]?/ {flag=0} flag" ALL_NOTES.md > RELEASE_NOTES.md || true
          # fallback
          if [ ! -s RELEASE_NOTES.md ]; then
            npx -y conventional-changelog-cli -p angular -r 0 > RELEASE_NOTES.md
          fi

      - name: Publicar GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          body_path: RELEASE_NOTES.md
```

---

## 2.2 Checklists

**Antes de criar uma release (`releases/X.Y.Z`)**

* [ ] `develop` atualizada e verde.
* [ ] **`package.json.version = X.Y.Z`** (ajustado na branch de release).
* [ ] PRs essenciais mesclados.
* [ ] Lint/tests ok.

**Para aprovar RC e promover a PROD**

* [ ] RC implantado e testado em QA (`vX.Y.Z-rc.N`).
* [ ] Testes funcionais/integração aprovados.
* [ ] (Opcional) `git flow release finish -m "<notas geradas>"` para a tag conter o corpo.
* [ ] `git push origin master develop --tags` concluído.

---

## 2.3 Anti-divergência antes do `finish`

> Garante que tudo local está “fast-forward” com o remoto e evita erros no `finish`.

```bash
git fetch --all --prune

git checkout master         && git pull origin master
git checkout develop        && git pull origin develop
git checkout releases/1.0.8 && git pull origin releases/1.0.8
```

---

## 2.4 Fluxos resumidos (cola)

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
# Criar release 1.0.8
git checkout develop && git pull
git flow release start 1.0.8                 # cria releases/1.0.8
npm version --no-git-tag-version 1.0.8
git add package.json package-lock.json 2>/dev/null || true
git commit -m "chore(release): set package.json version to 1.0.8"
git push -u origin releases/1.0.8            # dispara automação de RC -> v1.0.8-rc.1

# (Iterar RCs conforme QA valida; cada push em releases/1.0.8 gera novo -rc.N)

# Aprovado em QA → finalize com anti-divergência
git fetch --all --prune
git checkout master         && git pull origin master
git checkout develop        && git pull origin develop
git checkout releases/1.0.8 && git pull origin releases/1.0.8

# (Opcional mas útil para saber o que há em cada versão/tag) gerar notas e injetar na TAG do finish
NOTES=$(mktemp)
npx -y conventional-changelog-cli -p angular -r 1 > "$NOTES"

# Finaliza a release; cria v1.0.8 (estável) e back-merge p/ develop
git flow release finish -m "$(cat "$NOTES")" 1.0.8

# Publica branches e tags
git push origin master develop --tags
```

### HOTFIX (produção urgente)

```bash
git checkout master && git pull
git flow hotfix start 1.0.9
# ... commits ...
git flow hotfix finish 1.0.9
git push origin master develop --tags
```

---

## 2.5 Problemas comuns (e soluções rápidas) (FAQ)

* **“There is an existing release branch ‘X.Y.Z’. Finish that one first.”**
  → Termine a release pendente: `git flow release finish X.Y.Z` (ou `git flow release delete X.Y.Z` se for descartar).

* **“no tag message? Tagging failed” no `finish`**
  → Passe `-m "<mensagem>"` no `finish` **ou** deixe o job de PROD gerar Release Notes automaticamente.

* **RC não dispara**
  → Verifique: prefixo **`releases/`** no repositório **e** no workflow; `package.json.version` com o **mesmo X.Y.Z** da branch.

* **Release Notes vazias**
  → Garanta commits `feat:` / `fix:` entre o estável anterior e o atual **ou** use o `finish -m "$(…)"`. O job robusto também tem fallback.

---

## Comandos de inspeção úteis

```bash
# Últimas tags (mais novas primeiro)
git tag --sort=-creatordate | head

# Commits entre versões estáveis
git log --oneline v1.0.7..v1.0.8

# Diff entre RCs
git diff --stat v1.0.8-rc.1..v1.0.8-rc.2

# O que mudou na release atual vs develop
git diff --name-only origin/develop...HEAD
```

---

## Nota sobre nomes locais (dev/main)

Esta doc usa **develop/master** (padrão do trabalho). Se no seu **ambiente local** estiver `dev`/`main`, **ajuste o git-flow**:

```bash
git config gitflow.branch.develop dev
git config gitflow.branch.master  main
git config gitflow.prefix.release "releases/"
```

> **Recomendação:** mantenha o mesmo naming em **todos** os repos do time para reduzir erro operacional.

---

### Conclusão

* **RCs**: criados **somente por tag** (sem commit em `CHANGELOG.md`), evitando divergência.
* **PROD**: tag estável com Release Notes **robustas** (mensagem da tag → recorte ignorando RCs → fallback completo).
* **1.0.8**: passo-a-passo acima pronto para uso imediato.
