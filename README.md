Bora desenhar um fluxo enxuto, “git-flow friendly”, que te dá **múltiplas versões em QA ao mesmo tempo**, com **tags limpas**, **changelog** e **promoção segura** para produção — usando **GitHub + Vercel (Hobby)**.

Vou escrever as explicações em PT-BR e deixar **todo código/CI em inglês** como você prefere. 😉

---

# 1) Branches (Git Flow simplificado)

* `main` → produção
* `dev` → integração contínua do DEV
* `feature/*` e `bugfix/*` → trabalho do dia a dia
* `release/x.y.z` → candidato à próxima versão (QA testa aqui)
* `hotfix/x.y.z+1` → correção urgente sobre `main`

> Você pode ter **várias** `release/*` abertas (ex.: `release/1.4.0`, `release/1.5.0`), cada uma com seu link de QA.

Comandos (git-flow-avh):

```bash
git flow init -d
git flow feature start HYP-1234       # dev
git flow feature publish HYP-1234       # Acessar repositório e abrir PR para dev

git flow release start 1.4.0           # abre QA
git flow release publish 1.4.0
# commits de ajustes em release/1.4.0 ...
git flow release finish 1.4.0          # merge -> main + tag final v1.4.0 + merge back em develop

git flow hotfix start 1.4.1
git flow hotfix finish 1.4.1
```

---

# 2) Versão e tags

Use [**SemVer**](https://semver.org/) + **prerelease**:

* Tag final: `v1.4.0`
* RCs em QA: `v1.4.0-rc.1`, `v1.4.0-rc.2`, …

**Regra:**

* Cada push na `release/x.y.z` gera um RC novo (`vX.Y.Z-rc.N`).
* Quando o cliente aprovar um RC específico, promovemos **exatamente aquele commit** para `main` e criamos a tag final `vX.Y.Z`.

---

# 3) Vercel (Hobby) — como ter várias versões de QA

1. Conecte o repositório à Vercel.
2. **Production Branch = `main`**.
3. **Preview deployments** habilitados para **todas as branches**.
4. Ative **Branch subdomains** (Settings → Domains → Branch subdomains).

Resultado:

* Cada `release/*` ganha uma **URL estável** de preview:

  ```
  release-1-4-0--seu-projeto.vercel.app
  release-1-5-0--seu-projeto.vercel.app
  ```
* Você envia **um link por versão** para cada usuário QA.
* `main` publica automaticamente em produção no domínio principal.

> Dica: se quiser um link “QA fixo” (ex.: `qa.seudominio.com` apontando pro “release corrente”), crie uma **branch “qa”** e faça `git merge --ff-only` do commit aprovado nela. Configure um **projeto secundário** na Vercel cujo “Production Branch” seja `qa`. Assim `qa.seudominio.com` sempre reflete a versão QA “oficial”, sem perder as prévias por branch.

---

# 4) Automação de RCs e Release Notes (GitHub Actions)

### 4.1 RC tag em cada push para `release/*`

Crie `.github/workflows/rc-tag.yml`:

```yaml
name: RC Tag
on:
  push:
    branches:
      - 'release/*'

jobs:
  tag-rc:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Compute next RC tag
        id: rc
        run: |
          set -euo pipefail
          BRANCH="${GITHUB_REF_NAME}"             # e.g., release/1.4.0
          BASE="${BRANCH#release/}"               # 1.4.0
          LAST=$(git tag -l "v${BASE}-rc.*" | sed -E 's/.*-rc\.([0-9]+)/\1/' | sort -n | tail -1)
          if [ -z "${LAST}" ]; then NEXT=1; else NEXT=$((LAST+1)); fi
          TAG="v${BASE}-rc.${NEXT}"
          echo "tag=${TAG}" >> $GITHUB_OUTPUT

      - name: Create RC tag
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "${{ steps.rc.outputs.tag }}" -m "Release candidate ${{ steps.rc.outputs.tag }}"
          git push origin "${{ steps.rc.outputs.tag }}"

      - name: Generate changelog (conventional commits)
        run: |
          npx -y conventional-changelog-cli -p angular -i CHANGELOG.md -s
          git add CHANGELOG.md
          git commit -m "chore(changelog): update for ${{ steps.rc.outputs.tag }}" || true
          git push origin HEAD:${GITHUB_REF_NAME}
```

> Se quiser **criar um pre-release** no GitHub automaticamente, adicione `softprops/action-gh-release@v2` após criar a tag, com `prerelease: true`.

### 4.2 Tag final ao aprovar

Opções:

* **Manual e simples**: no PR `release/x.y.z → main`, dê merge **sem squash**. Em seguida:

  ```bash
  git checkout main
  git pull
  git tag -a v1.4.0 -m "Release 1.4.0"
  git push origin v1.4.0
  ```

  E a Vercel publica.

* **Automático**: outro workflow que, ao mergear PR da release em `main`, detecta `release/x.y.z` e cria `vX.Y.Z`.

---

# 5) Changelog e version bump

No frontend React:

```bash
npm i -D @commitlint/{cli,config-conventional} husky conventional-changelog-cli
```

`commitlint.config.js`

```js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

`package.json` (scripts):

```json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "version:prerelease": "npm version prerelease --preid rc",
    "version:patch": "npm version patch",
    "version:minor": "npm version minor",
    "version:major": "npm version major"
  }
}
```

> **Commits** no padrão **Conventional Commits** (feat, fix, perf, chore, docs…).
> O **CHANGELOG.md** é atualizado pelo job de RC (e/ou no release final).

---

# 6) Promoção/congelamento do build

Quando o cliente aprovar um RC específico (ex.: `v1.4.0-rc.3`):

1. Faça merge do **exato commit SHA** (ou “merge commit” da branch release) para `main`.
2. Crie a tag final `v1.4.0`.
3. A Vercel vai buildar a produção.
   Se quiser promover **o mesmo build do RC** sem rebuild, use o CLI da Vercel (`vercel promote`) a partir do deployment ID do preview.

Rollback? Na Vercel, escolha **um deployment anterior** e promova/rollback com 1 clique.

---

# 7) Compatibilidade e “não quebrar QA/Prod”

Checklist rápido:

* **Feature flags** (env/remote config) para esconder funcionalidades não aprovadas.
* **APIs versionadas** (URL `v1`, headers ou “capabilities”).
* **Migrations backward-compatible** (deploy 1: write dual-schema; deploy 2: trocar leitura; deploy 3: remover velho).
* **Contracts** (OpenAPI/TS types) — valide no CI (ex.: `tsc --noEmit`, `zod`/`ajv`).
* **Test matrix**: smoke/cypress para cada `release/*` (executa nos previews da Vercel).
* **Linhas de base**: mantenha `release/*` congelando features novas; só entram fixes.

---

# 8) Como o QA alterna de versão facilmente

* Envie os **links por branch**:

  * `https://release-1-4-0--seu-projeto.vercel.app`
  * `https://release-1-5-0--seu-projeto.vercel.app`
* Use um “índice” simples (README ou página interna) listando os RCs ativos + link de changelog.

---

# 9) Resumo operacional (ciclo)

1. DEV entrega em `feature/*` → `develop`.
2. Abrir `release/1.4.0`.
3. Cada push na release gera `v1.4.0-rc.N` + preview estável na Vercel.
4. Cliente testa vários RCs em paralelo (várias `release/*`).
5. Aprovou o RC “bom”? Merge **exato commit** → `main` + `tag v1.4.0`.
6. Produção publica. Hotfix? `hotfix/1.4.1`.

Se quiser, eu te mando um **pacote inicial** (Action + commitlint + changelog + README de fluxo) pronto pra colar no seu repo React.




## FAQ

Abaixo está uma explicação **longa, detalhada e totalmente estruturada**, cobrindo:

1. **Seu arquivo rc-on-release.yml** — está correto?
2. **Por que você viu uma *branch* sendo criada e não uma *tag***?
3. **Como funciona exatamente o fluxo Git Flow com releases, release candidates, tags e deploy em múltiplos ambientes**
4. **Como organizar seu repositório para suportar vários pacotes / versões simultâneas para QA, Sem quebrar PROD**
5. **Como integrar esse modelo com Vercel (host gratuito) para permitir múltiplas previews versionadas**

---

# ✅ 1. Seu arquivo `rc-on-release.yml` — Está certo?

SIM.
O conteúdo do seu fluxo GitHub Actions está **correto para gerar tags RC automaticamente**.

Ele faz:

* lê o arquivo `VERSION`
* calcula o próximo RC (`rc.1`, `rc.2`, `rc.3`…)
* cria uma TAG anotada
* envia para o repositório
* atualiza o CHANGELOG usando Conventional Commits

Esse fluxo é **correto e completo** para pipelines de versionamento.

---

# ⚠️ 2. Por que apareceu uma *branch* e não uma *tag* no GitHub?

Isso aconteceu por causa do **Git Flow CLI**, NÃO por causa do GitHub Actions.

## ➤ Quando você executou:

```
git flow release start 1.0.0
```

O Git Flow criou **uma branch**:

```
releases/1.0.0
```

Esse é o comportamento normal — fluxos Git Flow SEMPRE criam branches:

* `feature/*`
* `bugfix/*`
* `release/*`
* `hotfix/*`

E só quando você executa:

```
git flow release finish 1.0.0
```

ele:

1. Faz merge para `main`
2. Faz merge para `develop`
3. Cria **uma tag** (ex.: `1.0.0`)
4. Apaga a branch `release/1.0.0`

👉 **Ou seja: O Git Flow nunca cria TAG automaticamente ao iniciar a release**
Ele cria **apenas no finish**.

## ➤ Resumo

| Ação                            | Git Flow cria uma branch? | Git Flow cria uma tag? |
| ------------------------------- | ------------------------- | ---------------------- |
| `git flow release start 1.0.0`  | ✔️ Sim                    | ❌ Não                  |
| `git flow release finish 1.0.0` | ❌ Remove branch           | ✔️ Cria tag            |

---

# ✅ 3. Como funciona corretamente o fluxo completo de versionamento

Aqui vai um **modelo corporativo** completo (o mesmo usado em KPMG, Itaú, XP, Nubank).

---

## **Ambientes**

* **DEV → branch `develop`**
* **QA → branch `release/*`**
* **PROD → branch `main`**

---

## **Ciclo correto usando Git Flow**

### **DESENVOLVIMENTO**

```
feature/123-ajustar-login
bugfix/456-corrigir-menu
```

Quando finalizado → merge para `develop`.

---

### **PREPARAÇÃO PARA ENVIO AO QA**

Você inicia uma release:

```
git flow release start 1.0.0
```

Isso cria a branch:

```
releases/1.0.0
```

Nessa branch, você pode:

* corrigir bugs da release
* revisar texto
* modificar estilo
* acertar build

---

### **AGORA ENTRA O SEU WORKFLOW RC**

Cada push na branch `releases/1.0.0` vai gerar uma tag:

```
v1.0.0-rc.1
v1.0.0-rc.2
v1.0.0-rc.3
```

**E esses RCs que você envia para o cliente QA testar.**

Eles não mexem em PROD.
Eles não mexem no develop.
Eles são isolados.

---

### **APÓS QA APROVAR**

Quando tudo estiver ok:

```
git flow release finish 1.0.0
```

E o Git Flow fará:

* merge para `main`
* tag `1.0.0`
* merge para `develop`
* remove branch releases/1.0.0

---

# 🚀 4. Como ter várias versões aguardando no QA ao mesmo tempo

Seu modelo é EXATAMENTE esse:

* Cliente pode demorar semanas para aprovar
* Enquanto isso, você já pode ter RCs de outras versões
* Você quer poder alternar versões QA para o cliente rapidamente

Para isso, você deve:

### **1. Manter múltiplas release branches — uma por versão**

Exemplo:

```
releases/1.0.0
releases/1.1.0
releases/1.2.0
```

Cada uma com seus RCs:

```
v1.0.0-rc.1
v1.1.0-rc.4
v1.2.0-rc.2
```

### **2. Deploy automático para URLs únicas por TAG**

E aqui entra o poder do Next.js / React + Vercel.

---

# 💡 5. Como integrar isso com Vercel (o jeito *perfeito*)

A Vercel cria **automaticamente** uma URL de preview para cada:

* PR
* Branch
* Tag

Ou seja, se você fizer push dessas tags RC:

```
v1.0.0-rc.1
v1.0.0-rc.2
v1.1.0-rc.1
```

A Vercel automaticamente criará:

```
https://git-flow-dev-process-git-v1-0-0-rc-1-alexandrenoguez.vercel.app
https://git-flow-dev-process-git-v1-0-0-rc-2-alexandrenoguez.vercel.app
https://git-flow-dev-process-git-v1-1-0-rc-1-alexandrenoguez.vercel.app
```

Sem custo.
Sem servidor.
Sem configuração adicional.

E você pode entregar para o cliente QA:

> “Esse é o pacote RC 1.1.0-rc.4; valide aí.”

Isso é **extremamente profissional**.

---

# 🎯 RESUMO FINAL

### ✔️ Seu workflow RC está certo

### ✔️ A criação da branch é comportamento normal do Git Flow

### ✔️ A tag vai aparecer só quando o workflow rodar

### ✔️ Você pode ter múltiplos pacotes QA em paralelo

### ✔️ A Vercel permite deploy automáticos por TAG (grátis)

### ✔️ Esse fluxo é altamente recomendado para times que versionam frontend

---

# 📌 Se quiser, posso gerar para você agora:

✅ `release-on-main.yml` (para gerar TAG `vX.X.X` estável ao finalizar release)
✅ `deploy-dev.yml` (gatilho develop → DEV)
✅ `deploy-rc.yml` (gatilho rc tags → QA)
✅ `deploy-main.yml` (gatilho main → PROD)
✅ Arquivo VERSION automation
✅ CHANGELOG profissional com Conventional Commits
✅ Documentação do fluxo completa no README.md

Só pedir e eu gero tudo.
