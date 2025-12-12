<!-- Boa, agora é a parte divertida: “ensinar” o workflow a trabalhar pra ti 😄
Vou separar em:

1. Como **testar agora** se o workflow está ok
2. Fluxo “real” do Tech Lead: `dev` → `release` → `v1.0.11-rc.1` → (tempo passa) → `v1.0.11`
3. Como verificar se o **CHANGELOG** e a **Release** ficaram certos

---

## 1️⃣ Teste rápido agora (sem esperar 2 meses 😅)

Pré-requisitos:

- O arquivo já existe em: `.github/workflows/release-from-tag.yml`
- O repo tem um `CHANGELOG.md` com uma seção para a versão que você vai taguear, ex.:

```md
## v1.0.11

- feat: ...
- fix: ...
```

ou

```md
## 1.0.11

- feat: ...
- fix: ...
```

> O script do workflow aceita `## v1.0.11` ou `## 1.0.11`. -->

### Passo a passo do teste

1. **Garanta que o CHANGELOG está commitado**

No seu repo local:

```bash
git status
# Se CHANGELOG.md estiver modificado:
git add CHANGELOG.md
git commit -m "chore: update changelog for v1.0.11"
git push
```

2. **Crie uma tag estável de teste**

Escolhe uma versão real que você queira (ex: `v1.0.11`) ou uma dummy tipo `v0.0.99`:

```bash
git tag -a v1.0.11 -m "Release v1.0.11"
git push origin v1.0.11
```

3. **Verifique o workflow**

- Vá em **GitHub → Actions**.
- Procure pelo workflow `Create GitHub Release from tag and CHANGELOG` (ou o nome que você colocou no `name:`).
- Deve aparecer um run com o ref `refs/tags/v1.0.11`.
- Ele precisa terminar como ✅.

4. **Verifique a Release**

- Vá em **GitHub → Releases**.
- Deve existir uma release `v1.0.11`.
- Abra e confira:

  - Título: `v1.0.11` (ou o que você configurou).
  - Corpo (description): a seção do `CHANGELOG.md` correspondente à versão `1.0.11`.

Se isso tudo funcionou, o workflow está validado.
Agora vamos para o fluxo “bonito” com `dev` → RC → estável.

---

## 2️⃣ Fluxo real com Git Flow, RC e promoção para estável

Vou considerar:

- Branch principal de integração: `dev`
- Branch de produção: `main`
- Versão alvo: `1.0.11`
- RC: `v1.0.11-rc.1`, `v1.0.11-rc.2`, etc.
- Workflow dispara **só** em tags `v*.*.*` (sem `-rc`).

### 2.1. Dev termina a feature

Fluxo clássico:

```bash
# dev
git checkout dev
git pull origin dev

# cria feature
git flow feature start HYP-123-add-new-feature
# codar, commitar, etc
git push feature publish

# abre PR: feature/HYP-123-add-new-feature -> dev
# merge feito via GitHub
```

Beleza. Agora `dev` está com tudo que deve ir pra versão `1.0.11`.

---

### 2.2. Tech Lead cria a release a partir de `dev`

1. Atualizar `dev` local:

```bash
git checkout dev
git pull origin dev
```

2. Criar branch de release:

```bash
git flow release start 1.0.11
# cria: release/1.0.11
git push -u origin release/1.0.11
```

A partir de agora, qualquer ajuste para essa versão vai para `release/1.0.11`.

---

### 2.3. Criar a RC para QA: `v1.0.11-rc.1`

Na release:

```bash
git checkout release/1.0.11
git pull
```

Cria a tag de RC:

```bash
git tag -a v1.0.11-rc.1 -m "Release candidate 1 for 1.0.11"
git push origin v1.0.11-rc.1
```

- Essa tag **NÃO** dispara o workflow (o `on: push: tags: ["v*.*.*"]` não casa `v1.0.11-rc.1`).
- Sua pipeline de QA pode usar essas tags RC pra deploy.

Se forem necessários ajustes, você:

- Commit na `release/1.0.11`;
- Cria novas RCs (`v1.0.11-rc.2`, etc.) da mesma forma.

---

### 2.4. Meses depois: QA aprovou v1.0.11 → agora é “versão estável”

Quando decidirem “agora é a versão oficial”:

#### (1) Garanta que a release está atualizada

```bash
git checkout release/1.0.11
git pull
```

#### (2) Atualize o `CHANGELOG.md` localmente

Assumindo que você já tem o script no `package.json`:

```jsonc
"scripts": {
  "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s"
}
```

Roda:

```bash
npm install   # se ainda não instalou deps
npm run changelog
```

Isso vai:

- Ler commits (normalmente com Conventional Commits).
- Atualizar/adicionar a seção da versão `1.0.11`.

Abra o `CHANGELOG.md` e confira que existe algo assim:

```md
## 1.0.11

- feat: ...
- fix: ...
- chore: ...
```

ou

```md
## v1.0.11

...
```

#### (3) Commitar o changelog

```bash
git add CHANGELOG.md
git commit -m "chore: update changelog for v1.0.11"
git push
```

#### (4) Finalizar a release com Git Flow

```bash
git flow release finish 1.0.11
```

Isso vai:

- Dar merge de `release/1.0.11` em `main`;
- Criar a tag `1.0.11` (sem `v`) em `main`;
- Dar merge de volta em `dev`;
- Apagar `release/1.0.11` local.

Depois:

```bash
git checkout main
git push origin main --follow-tags

git checkout dev
git push origin dev
```

> Aqui, o `--follow-tags` vai subir a tag `1.0.11`, mas **nosso workflow não usa essa tag** (ele ouve `v*.*.*`).
> Isso é proposital: a tag “oficial pro mundo” será `v1.0.11`.

#### (5) Criar a tag “bonita” que dispara o workflow: `v1.0.11`

Agora que `main` já está com a versão 1.0.11 (merge feito pelo `release finish`):

```bash
git checkout main
git pull origin main

# cria a tag com prefixo v
git tag -a v1.0.11 -m "Release v1.0.11"
git push origin v1.0.11
```

**Nesse exato push**, o `release-from-tag.yml` dispara e:

- Lê o `CHANGELOG.md`;
- Extrai a seção da versão `1.0.11`;
- Cria a Release `v1.0.11` no GitHub com aquele conteúdo.

---

## 3️⃣ Como verificar se o `CHANGELOG.md` e a Release ficaram corretos

### 3.1. Antes de criar a tag `v1.0.11`

Ainda na `release/1.0.11` (ou já em `main`, depois do finish), você confere:

1. Abrindo localmente:

```bash
code CHANGELOG.md
# ou
cat CHANGELOG.md
```

2. Ver se existe uma seção bem clara para `1.0.11`:

```md
## 1.0.11

- feat: ...
- fix: ...
  ...
```

Se estiver ok → commit + push como fizemos.

---

### 3.2. Depois de pushar a tag `v1.0.11`

1. **Actions**

- Vá em **Actions** no GitHub.
- Procure o workflow `Create GitHub Release from tag and CHANGELOG`.
- Deve haver um run com `v1.0.11` como referência.
- Abra esse run:

  - Veja o step **Extract changelog section for this tag**:

    - Nos logs ele imprime:

      ```text
      Changelog section for 1.0.11:
      ## 1.0.11
      - ...
      ```

    - Se isso bater com o que você viu no arquivo, tá lindo.

2. **Releases**

- Vá em **Releases**.
- Deve ter uma nova Release `v1.0.11`.
- Clique nela:

  - O **corpo** (description) deve ser exatamente a seção do `CHANGELOG.md` para `1.0.11`.

3. **Repo**

- O workflow que te passei **não faz commit de volta**.
- Então:

  - O `CHANGELOG.md` é exatamente o que você commitou antes da tag.
  - Não aparece “commit do bot” depois da tag — bem limpinho.

---

## 4️⃣ E as RCs, de novo?

- `v1.0.11-rc.1`, `v1.0.11-rc.2` etc.:

  - Servem para QA / staging.
  - Não disparam esse workflow.
  - Você normalmente **não** cria Release no GitHub para cada RC (para não poluir).

- Apenas quando você criar **`v1.0.11`** é que:

  - O workflow roda;
  - Usa o `CHANGELOG.md` consolidado da versão;
  - Cria a Release final bonitinha.

---

Se quiser, depois posso te ajudar a:

- ajustar o parser do `CHANGELOG.md` caso você queira usar formato tipo `## [1.0.11] - 2025-12-09`;
- ou criar um segundo workflow só para RCs (ex: logar em QA qual commit/tag entrou) sem mexer no changelog.
