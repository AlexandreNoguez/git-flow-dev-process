# Guia de Uso do Git Flow (CLI) com branches `dev` e `main`

## 1. Objetivo

Padronizar o fluxo de desenvolvimento usando **Git Flow (CLI)** em repositórios GitHub, com:

* `main` como branch de produção;
* `dev` como branch de integração;
* branches de `feature`, `release` e `hotfix`;
* fluxo específico para **Tech Leads** gerarem **tags** (RC e estáveis) com **descrição** e **changelog semi-automatizado**.

> ⚠️ Desde o Git 2.51+, o Git Flow não vem mais embutido na instalação do Git (precisa ser instalado à parte). ([Jira][1])

---

## 2. Conceitos rápidos

### 2.1. Branches principais

* **`main`**

  * Sempre reflete o código em **produção**.
  * Só recebe merge via **release** ou **hotfix**.

* **`dev`**

  * Branch de **integração**.
  * Todas as **features** e **bugfixes** entram aqui antes de seguirem para release.

### 2.2. Branches de suporte do Git Flow

Padrão de nomes:

* **feature**: `feature/<ticket>-<descricao-curta>`
* **release**: `release/<versao>`
* **hotfix**: `hotfix/<versao>`

Exemplos:

```bash
feature/HYP-123-add-search
release/1.4.0
hotfix/1.4.1
```

### 2.3. Commits (recomendado: Conventional Commits)

Para possibilitar changelog automático, recomendamos seguir **Conventional Commits**: ([Conventional Commits][2])

Formato:

```text
<type>[optional scope]: <description>
```

Tipos mais usados:

* `feat`: nova funcionalidade
* `fix`: correção de bug
* `chore`: mudanças de infra/ci/build
* `docs`, `test`, `refactor`, etc.

Exemplos:

```text
feat: add gmail OAuth button
fix(create-workspace): handle null workspace hash
chore: update release pipeline
```

---

## 3. Instalação

### 3.1. Pré-requisitos gerais

* Git instalado (qualquer SO) ([Git][3])
* Acesso ao repositório no GitHub (SSH ou HTTPS configurado).

---

### 3.2. Ubuntu 24.04

1. **Instalar Git**

```bash
sudo apt update
sudo apt install -y git
```

2. **Instalar Git Flow**

```bash
sudo apt install -y git-flow
```

O pacote `git-flow` nos repositórios Debian/Ubuntu instala a versão AVH do Git Flow (extensão em shell baseada no modelo do Vincent Driessen). ([Stack Overflow][4])

3. **Verificar instalação**

```bash
git --version
git flow version
```

---

### 3.3. Windows (Git for Windows + Git Flow)

#### 3.3.1. Instalar Git for Windows

1. Baixar o instalador de Git for Windows no site oficial. ([Git][5])
2. Durante a instalação, habilitar o **Git Bash**.

#### 3.3.2. Instalar Git Flow via Chocolatey (recomendado)

1. Instalar **Chocolatey** conforme documentação oficial. ([ASP.NET Hacker][6])
2. Abrir **PowerShell como Administrador** e executar:

```powershell
choco install gitflow-avh -y
```

O pacote `gitflow-avh` instala o Git Flow (AVH Edition) e integra com o Git Bash. ([GeeksforGeeks][7])

3. Fechar e reabrir o **Git Bash**, então testar:

```bash
git flow version
```

#### 3.3.3. Alternativa: instalação manual (se Chocolatey não for permitido)

1. Clonar o repositório do git-flow-avh:

```bash
git clone https://github.com/petervanderdoes/gitflow-avh.git
```

2. No **PowerShell como Administrador**, dentro da pasta `gitflow-avh`:

```powershell
contrib\msysgit-install.cmd "C:\Program Files\Git\usr"
```

3. Testar no Git Bash:

````bash
git flow version
``` :contentReference[oaicite:7]{index=7}

---

## 4. Configurando o Git Flow em um repositório (dev + main)

### 4.1. Preparar branches `main` e `dev`

Se o repositório já existe no GitHub com branch `main`, clone normalmente:

```bash
git clone git@github.com:empresa/projeto.git
cd projeto
````

Criar e subir a branch `dev` (uma única vez por repositório):

```bash
git checkout main
git pull origin main

git checkout -b dev
git push -u origin dev
```

> Dica: no GitHub, configure a **branch padrão** do repositório para `dev` se for o branch onde a equipe cria PRs de feature. ([skoch.github.io][8])

---

### 4.2. Rodar `git flow init` com `main` e `dev`

No repositório local, estando em qualquer branch (recomendado `dev`):

```bash
git flow init
```

Responda às perguntas:

```text
Which branch should be used for production releases? [main]  main
Which branch should be used for development? [dev]           dev
How to name your feature branches? [feature/]               (enter)
How to name your release branches? [release/]               (enter)
How to name your hotfix branches? [hotfix/]                 (enter)
How to name your support branches? [support/]               (enter ou vazio)
```

Isso grava a configuração em `.git/config` para aquele repositório, mantendo:

* `main` como branch de produção;
* `dev` como branch de desenvolvimento; ([Genie의 개발노트][9])

---

## 5. Fluxo do dia a dia para Desenvolvedores

### 5.1. Criar uma nova feature

1. Atualizar a branch `dev` local:

```bash
git checkout dev
git pull origin dev
```

2. Iniciar a feature com Git Flow:

```bash
git flow feature start HYP-123-add-search
```

Isso cria e muda para a branch:

```text
feature/HYP-123-add-search
```

3. Enviar branch para o GitHub (para abrir PR):

```bash
git flow feature publish
```

---

### 5.2. Trabalhar na feature

Ciclo normal:

```bash
# editar código...

git status
git add .
git commit -m "feat: add search bar on header"
git push
```

Abrir uma **Pull Request**:

* **from**: `feature/HYP-123-add-search`
* **to**: `dev`

> 🔎 **Se o time exige PR obrigatória**:
>
> * faça o merge via GitHub (após review);
> * depois só delete a branch local com `git branch -d feature/HYP-123-add-search`;
> * **não** rode `git flow feature finish` nesse caso (o merge já foi feito).

---

### 5.3. Finalizar uma feature via Git Flow (modo “CLI faz o merge”)

> Use este modo se o fluxo permitir merge direto na `dev` sem obrigatoriedade de PR.

1. Certificar que a feature está atualizada:

```bash
git checkout feature/ECO-123-add-search
git pull
git checkout dev
git pull origin dev
git checkout feature/ECO-123-add-search
# git rebase dev    # opcional, para alinhar com dev
```

2. Finalizar a feature:

```bash
git flow feature finish ECO-123-add-search
```

O que acontece:

* Faz merge da feature em `dev` (normalmente com `--no-ff`);
* Deleta a branch de feature local.

3. Subir alterações:

```bash
git checkout dev
git push origin dev
```

Se quiser remover a branch remota:

```bash
git push origin --delete feature/ECO-123-add-search
```

---

### 5.4. Correções rápidas em `dev` (bugfix simples)

Se não for abrir `hotfix` para produção, mas apenas corrigir algo em `dev`:

* Crie uma **feature** ou **bugfix** curta (ex: `feature/HYP-999-fix-typo`) e siga o fluxo normal; **ou**

---

## 6. Fluxo de Release para Tech Leads

Esta seção descreve o fluxo recomendado para **Tech Leads**, incluindo:

* criação de branches de **release**;
* **tags** RC e estáveis;
* geração de **changelog semi-automatizado** baseada em Conventional Commits.

### 6.1. Convenções de versão e tags

Sugestão (adaptável):

* Versão sem prefixo no Git Flow: `1.4.0`
* Tags no repositório:

  * **Release Candidate**: `v1.4.0-rc.1`, `v1.4.0-rc.2`, etc.
  * **Release estável**: `v1.4.0`

> Ex:
>
> * QA: usa tags `v1.4.0-rc.X`
> * Produção: usa tags `v1.4.0`

---

### 6.2. Iniciar uma release

1. Atualizar `dev`:

```bash
git checkout dev
git pull origin dev
```

2. Iniciar branch de release:

```bash
git flow release start 1.4.0
```

Cria a branch:

```text
release/1.4.0
```

3. Push da branch release (para reviews e pipelines de QA):

```bash
git push -u origin release/1.4.0
```

---

### 6.3. Criar tags RC para QA

Sempre que quiser gerar uma **RC** para QA a partir da `release/1.4.0`:

```bash
git checkout release/1.4.0
git pull

git tag -a v1.4.0-rc.1 -m "Release candidate 1 for 1.4.0"
git push origin v1.4.0-rc.1
```

Para próxima RC:

```bash
git tag -a v1.4.0-rc.2 -m "Release candidate 2 for 1.4.0"
git push origin v1.4.0-rc.2
```

O pipeline de QA pode ser configurado para disparar deploy quando recebe tags `*-rc.*`.

---

### 6.4. Gerar changelog semi-automatizado

Para um changelog mais rico, baseado em **Conventional Commits**, podemos usar o pacote **`conventional-changelog-cli`** (Node.js). ([npmjs.com][10])

#### 6.4.1. Instalação (devDependency)

Na raiz do projeto:

```bash
npm install -D conventional-changelog-cli
```

#### 6.4.2. Script recomendado no `package.json`

```jsonc
{
  "scripts": {
    "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s -r 0"
  }
}
```

* `-p conventionalcommits`: usa o preset dos Conventional Commits;
* `-i CHANGELOG.md -s`: lê e sobrescreve o arquivo `CHANGELOG.md`;
* `-r 0`: gera changelog para **todas** as versões desde o início.
  (Em pipelines você pode ajustar para só a partir da última tag.)

#### 6.4.3. Como o Tech Lead gera o changelog da release

1. Estar na branch de release:

```bash
git checkout release/1.4.0
git pull
```

2. Rodar script de changelog:

```bash
npm run changelog
```

3. Revisar o `CHANGELOG.md` (ajustar textos/títulos se necessário).

4. Commitar o changelog:

```bash
git add CHANGELOG.md
git commit -m "chore: update changelog for v1.4.0"
git push
```

> 💡 Isso é “semi-automatizado”: a ferramenta gera a base, o Tech Lead faz o refinamento final.

---

### 6.5. Finalizar a release (merge em `main` + `dev` + tag estável)

Quando a release estiver OK em QA (última RC aprovada):

1. Certificar que `release/1.4.0` está atualizada:

```bash
git checkout release/1.4.0
git pull
```

2. Finalizar release com Git Flow:

```bash
git flow release finish 1.4.0
```

O que o comando faz automaticamente: ([blog.betrybe.com][11])

* Faz merge de `release/1.4.0` em `main`;
* Cria **tag anotada** `1.4.0` em `main`;
* Faz merge de volta em `dev` (para não perder commits de correção feitos na release);
* Deleta a branch local `release/1.4.0`.

3. Enviar branches e tags:

```bash
git checkout main
git push origin main --follow-tags

git checkout dev
git push origin dev
```

4. (Opcional) Padronizar a tag com prefixo `v` no GitHub:

Se quiser manter o padrão `v1.4.0`, pode:

```bash
git tag -a v1.4.0 1.4.0 -m "Release v1.4.0"
git push origin v1.4.0
```

> Em pipelines, você pode escutar **apenas tags `v*`** para produção.

---

### 6.6. Criar Release no GitHub usando tag e changelog

No GitHub:

1. Ir em **Releases → Draft a new release**;
2. Selecionar a tag `v1.4.0` (ou criar a partir dali);
3. Copiar a seção correspondente a `v1.4.0` do `CHANGELOG.md`;
4. Ajustar título (ex: `Release v1.4.0`) e colar o changelog na descrição;
5. Publicar.

---

## 7. Fluxo de Hotfix para produção

Quando houver bug crítico em produção:

1. Atualizar `main`:

```bash
git checkout main
git pull origin main
```

2. Iniciar hotfix:

```bash
git flow hotfix start 1.4.1
```

Cria:

```text
hotfix/1.4.1
```

3. Implementar correção:

```bash
# editar código...
git add .
git commit -m "fix: handle null file hash on upload"
git push -u origin hotfix/1.4.1
```

4. (Opcional) gerar um changelog parcial da hotfix (mesmo esquema da release).

5. Finalizar hotfix:

```bash
git flow hotfix finish 1.4.1
```

O que faz:

* Merge do hotfix para `main` e `dev`;
* Tag `1.4.1` criada em `main`.

6. Subir tudo:

```bash
git checkout main
git push origin main --follow-tags

git checkout dev
git push origin dev
```

7. Criar release no GitHub para `v1.4.1` (opcional).

---

## 8. Resumo rápido (cola para dev)

**Setup (por repo, feito 1x):**

```bash
git clone git@github.com:empresa/projeto.git
cd projeto

git checkout -b dev
git push -u origin dev

git flow init
# production = main
# development = dev
# prefixes padrão
```

**Nova feature (modo com PR):**

```bash
git checkout dev
git pull origin dev

git flow feature start ECO-123-add-search
git push -u origin feature/ECO-123-add-search

# commit e push normalmente
# abrir PR: feature/ECO-123-add-search -> dev
# após merge: git branch -d feature/ECO-123-add-search
```

**Nova feature (modo finish pelo CLI):**

```bash
git flow feature start ECO-123-add-search
# dev work...

git flow feature finish ECO-123-add-search
git push origin dev
```

---

Se você quiser, no próximo passo posso montar **templates prontos** de:

* política de branch/PR (para colocar no `CONTRIBUTING.md`);
* modelo de PR com checklist específico para Git Flow + Conventional Commits;
* snippet de GitHub Actions para gerar changelog automaticamente quando sair uma nova tag `vX.Y.Z`.

[1]: https://jira.atlassian.com/browse/SRCTREEWIN-14619?utm_source=chatgpt.com "Git-Flow not recognized with Microsoft Git (VFS) version 2.51.1 ..."
[2]: https://www.conventionalcommits.org/en/v1.0.0/?utm_source=chatgpt.com "Conventional Commits"
[3]: https://git-scm.com/book/pt-br/v2/Come%C3%A7ando-Instalando-o-Git?utm_source=chatgpt.com "Instalando o Git"
[4]: https://stackoverflow.com/questions/36442801/how-to-install-git-flow-1-9-1-avh-in-ubuntu-14?utm_source=chatgpt.com "How to install git-flow 1.9.1 AVH in Ubuntu 14?"
[5]: https://git-scm.com/install/windows?utm_source=chatgpt.com "Git - Install for Windows"
[6]: https://asp.net-hacker.rocks/2019/04/01/git-flow.html?utm_source=chatgpt.com "Git Flow - About, installing and using"
[7]: https://www.geeksforgeeks.org/git/git-flow/?utm_source=chatgpt.com "Git Flow"
[8]: https://skoch.github.io/Git-Workflow/?utm_source=chatgpt.com "Git Flow Setup"
[9]: https://andrew75313.tistory.com/202?utm_source=chatgpt.com "(25.02.26) Git Flow 명령어와 활용 정리 - Genie의 개발노트"
[10]: https://www.npmjs.com/package/conventional-changelog-cli?utm_source=chatgpt.com "conventional-changelog-cli"
[11]: https://blog.betrybe.com/git/git-flow/?utm_source=chatgpt.com "Git Flow: o que é e como gerenciar branches? Exemplos!"
