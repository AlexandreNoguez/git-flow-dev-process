## 📌 Resumo – Comandos do dia a dia do Dev

### 1. Setup inicial (por repositório)

```bash
# clonar o repo
git clone git@github.com:empresa/projeto.git
cd projeto

# inicializar git flow
git flow init
# production branch: main
# development branch: dev
# prefixes: feature/, release/, hotfix/
```

---

### 2. Atualizar ambiente antes de começar a trabalhar

```bash
git checkout dev
git pull origin dev
```

---

### 3. Criar uma nova feature

```bash
# sempre partir da dev atualizada
git checkout dev
git pull origin dev

# cria branch de feature
git flow feature start HYP-123-add-search
# isso cria: feature/HYP-123-add-search

# sobe a feature pro GitHub
git push -u origin feature/HYP-123-add-search
```

---

### 4. Trabalhar na feature (loop normal)

```bash
# editar código...

git status
git add .
git commit -m "feat: add search bar on header"
git push
```

Depois disso:
👉 abrir **PR** de `feature/HYP-123-add-search` → `dev`.

---

### 5. Depois do merge do PR

Se o merge foi feito pelo GitHub:

```bash
# apagar branch local
git branch -d feature/HYP-123-add-search

# apagar branch remota (opcional, mas recomendado)
git push origin --delete feature/HYP-123-add-search
```

---

<!-- ### 6. Alternativa: finalizar feature pelo Git Flow (quando permitido)

Se o time permite **merge direto em dev** via CLI (sem PR):

```bash
# garantir tudo atualizado
git checkout dev
git pull origin dev

git checkout feature/HYP-123-add-search
git rebase dev   # opcional

# finaliza feature (merge + delete local)
git flow feature finish HYP-123-add-search

# sobe a dev atualizada
git checkout dev
git push origin dev
```

--- -->

## 🎯 Resumo – Comandos para Tech Lead gerar versões

### 1. Criar uma nova release

```bash
git checkout dev
git pull origin dev

git flow release start 1.4.0
# cria: release/1.4.0

git push -u origin release/1.4.0
```

---

### 2. Gerar tag de Release Candidate (RC) para QA

Sempre em cima da branch de release:

```bash
git checkout release/1.4.0
git pull

# primeira RC
git tag -a v1.4.0-rc.1 -m "Release candidate 1 for 1.4.0"
git push origin v1.4.0-rc.1

# próxima RC, se precisar
git tag -a v1.4.0-rc.2 -m "Release candidate 2 for 1.4.0"
git push origin v1.4.0-rc.2
```

(Pipelines de QA podem ser configurados para disparar em `v*-rc.*`.)

---

### 3. Gerar changelog (semi-automático)

Assumindo que você já tem no `package.json`:

```jsonc
"scripts": {
  "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s"
}
```

Na branch de release:

```bash
git checkout release/1.4.0
git pull

npm run changelog   # atualiza CHANGELOG.md

git add CHANGELOG.md
git commit -m "chore: update changelog for v1.4.0"
git push
```

---

### 4. Finalizar a release (merge em main + dev + tag estável)

Quando QA aprovar:

```bash
git checkout release/1.4.0
git pull

git flow release finish 1.4.0
```

Isso automaticamente:

- faz merge em `main`;
- cria tag `1.4.0` em `main`;
- faz merge de volta em `dev`;
- apaga `release/1.4.0` local.

Depois subir tudo:

```bash
git checkout main
git push origin main --follow-tags

git checkout dev
git push origin dev
```

Opcionalmente, padronizar com prefixo `v`:

```bash
git tag -a v1.4.0 1.4.0 -m "Release v1.4.0"
git push origin v1.4.0
```

---

### 5. Hotfix para produção (bug crítico)

```bash
# partir da main
git checkout main
git pull origin main

git flow hotfix start 1.4.1
# cria: hotfix/1.4.1

# implementar correção
git add .
git commit -m "fix: handle null hash on file upload"

# finalizar hotfix
git flow hotfix finish 1.4.1

# subir main + tags + dev
git checkout main
git push origin main --follow-tags

git checkout dev
git push origin dev
```

Se quiser, no próximo passo a gente transforma esse resumo em um **“Cheat Sheet” em PDF ou Markdown imprimível** (tipo folha A4, com tabelinha de comandos por papel: Dev x Tech Lead).
