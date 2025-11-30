**deploys por TAG** de forma limpa — tanto no **GitHub Actions** quanto no **Azure DevOps** — usando este padrão:

- **RC/QA:** tags `vX.Y.Z-rc.N` (ex.: `v1.4.0-rc.3`) → deploy para QA.
- **PROD:** tags estáveis `vX.Y.Z` (ex.: `v1.4.0`) → deploy para produção.

Abaixo deixo **workflows prontos** para os dois mundos, com duas opções de destino (Vercel _ou_ Azure App Service). Use o destino que preferir em cada exemplo e apague o bloco que não for usar.

---

# GitHub Actions

## 1) Deploy **QA** quando sair **RC tag** (`v*-rc.*`)

Crie `.github/workflows/qa-on-rc-tag.yml`:

```yaml
name: Deploy QA on RC tag

on:
  push:
    tags:
      - "v*-rc.*" # Dispara só em tags de RC (vX.Y.Z-rc.N)

jobs:
  deploy-qa:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # (A) VERCEL — Frontend/SSR
      # Requer: secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
      # Habilite "Git Tag Deployments" no projeto Vercel (ou use CLI abaixo).
      - name: Vercel (QA) - Deploy com CLI
        if: ${{ env.USE_VERCEL == 'true' }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm i -g vercel@latest
          vercel pull --yes --environment=preview --token $VERCEL_TOKEN
          vercel build --token $VERCEL_TOKEN
          vercel deploy --prebuilt --token $VERCEL_TOKEN \
            --env RELEASE_TAG=${GITHUB_REF_NAME} \
            --scope $VERCEL_ORG_ID

      # (B) AZURE APP SERVICE — ZipDeploy de um site estático/Node
      # Requer: secrets AZURE_CREDENTIALS (JSON do SP), app já criado (ex.: myapp-qa)
      # e, se for Node, um build (npm ci && npm run build) antes de zipar.
      - name: Azure Login
        if: ${{ env.USE_AZURE == 'true' }}
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build (opcional p/ Node/React)
        if: ${{ env.USE_AZURE == 'true' }}
        run: |
          if [ -f package.json ]; then
            npm ci
            npm run build || true
          fi

      - name: Zip artifact
        if: ${{ env.USE_AZURE == 'true' }}
        run: |
          mkdir -p out
          if [ -d build ]; then zip -r out/site.zip build; \
          elif [ -d dist ]; then zip -r out/site.zip dist; \
          elif [ -d html ]; then zip -r out/site.zip html; \
          else zip -r out/site.zip .; fi

      - name: Deploy to Azure WebApp (QA)
        if: ${{ env.USE_AZURE == 'true' }}
        uses: azure/webapps-deploy@v3
        with:
          app-name: "myapp-qa" # <-- seu app QA
          package: "out/site.zip"
```

> Dica: defina `USE_VERCEL=true` _ou_ `USE_AZURE=true` em **Repository → Actions → Variables** (ou troque por `if: false` no bloco que não usar).
> Para **Vercel**, guarde `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` em **Actions → Secrets**.

---

## 2) Deploy **PROD** quando sair **tag estável** (`vX.Y.Z`)

Crie `.github/workflows/prod-on-stable-tag.yml`:

```yaml
name: Deploy PROD on stable tag

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+" # somente SemVer estável

jobs:
  deploy-prod:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Evita rodar em RC por acidente (se o padrão acima for afrouxado)
      - name: Guard - recusa RC
        run: |
          case "${GITHUB_REF_NAME}" in
            *-rc.*) echo "RC detectado; PROD não roda em RC"; exit 1;;
            *) echo "Tag estável OK: ${GITHUB_REF_NAME}";;
          esac

      # (A) VERCEL — deploy de produção
      - name: Vercel (PROD) - Deploy com CLI
        if: ${{ env.USE_VERCEL == 'true' }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm i -g vercel@latest
          vercel pull --yes --environment=production --token $VERCEL_TOKEN
          vercel build --prod --token $VERCEL_TOKEN
          vercel deploy --prebuilt --prod --token $VERCEL_TOKEN \
            --env RELEASE_TAG=${GITHUB_REF_NAME} \
            --scope $VERCEL_ORG_ID

      # (B) AZURE APP SERVICE — produção
      - name: Azure Login
        if: ${{ env.USE_AZURE == 'true' }}
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build (opcional)
        if: ${{ env.USE_AZURE == 'true' }}
        run: |
          if [ -f package.json ]; then
            npm ci
            npm run build || true
          fi

      - name: Zip artifact
        if: ${{ env.USE_AZURE == 'true' }}
        run: |
          mkdir -p out
          if [ -d build ]; then zip -r out/site.zip build; \
          elif [ -d dist ]; then zip -r out/site.zip dist; \
          elif [ -d html ]; then zip -r out/site.zip html; \
          else zip -r out/site.zip .; fi

      - name: Deploy to Azure WebApp (PROD)
        if: ${{ env.USE_AZURE == 'true' }}
        uses: azure/webapps-deploy@v3
        with:
          app-name: "myapp-prod" # <-- seu app PROD
          package: "out/site.zip"
```

> **Estratégia recomendada no Azure App Service (free não tem slot):**
> use **dois apps**: `myapp-qa` (para RC) e `myapp-prod` (para estáveis). Variáveis de ambiente diferentes por app.

---

# Azure DevOps (YAML)

O Azure DevOps **suporta gatilhos por TAG** no YAML (campo `tags` no `trigger`) — você pode acionar a pipeline quando uma tag for criada e, dentro da pipeline, direcionar para QA ou PROD conforme o padrão da tag.

## Pipeline único com dois estágios (QA/PROD) por TAG

Arquivo `azure-pipelines.yml`:

```yaml
# Dispara quando qualquer tag "v*" é criada
trigger:
  tags:
    include:
      - v* # pega v1.2.3-rc.1 e v1.2.3

pr: none

pool:
  name: "azure-lab-agent" # seu agente self-hosted
  demands:
    - Agent.OS -equals Linux

variables:
  AZ_APP_QA: "myapp-qa" # WebApp QA
  AZ_APP_PROD: "myapp-prod" # WebApp PROD
  BUILD_DIR: "dist" # ou "build"/"html", conforme seu projeto

stages:
  # 1) Classifica a TAG (RC x estável)
  - stage: classify
    displayName: "Classify tag"
    jobs:
      - job: classify
        steps:
          - bash: |
              echo "Tag recebida: $(Build.SourceBranchName)"
              if [[ "$(Build.SourceBranchName)" == *-rc.* ]]; then
                echo "##vso[task.setvariable variable=IS_RC]true"
                echo "##vso[task.setvariable variable=DEPLOY_APP]$(AZ_APP_QA)"
              else
                echo "##vso[task.setvariable variable=IS_RC]false"
                echo "##vso[task.setvariable variable=DEPLOY_APP]$(AZ_APP_PROD)"
              fi
            displayName: "Detecta se é RC"
          - bash: |
              echo "IS_RC=$(IS_RC)"
              echo "DEPLOY_APP=$(DEPLOY_APP)"
            displayName: "Echo vars"

  # 2) QA — roda só se for RC
  - stage: qa
    displayName: "Deploy QA (RC)"
    dependsOn: classify
    condition: and(succeeded(), eq(variables['IS_RC'], 'true'))
    jobs:
      - job: deploy_qa
        steps:
          - checkout: self

          # Se for buildar (Node/React), inclua seu build aqui
          - bash: |
              if [ -f package.json ]; then
                npm ci
                npm run build || true
              fi
            displayName: "Build opcional"

          - bash: |
              mkdir -p out
              if [ -d "$(BUILD_DIR)" ]; then zip -r out/site.zip "$(BUILD_DIR)"; \
              elif [ -d html ]; then zip -r out/site.zip html; \
              else zip -r out/site.zip .; fi
            displayName: "Zip artifact"

          - task: AzureCLI@2
            displayName: "ZipDeploy (QA)"
            inputs:
              azureSubscription: "azure-test-lab" # seu service connection
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                set -euo pipefail
                az webapp deploy \
                  -g azure-lab-nginx \
                  -n "$(DEPLOY_APP)" \
                  --type zip --src-path out/site.zip

  # 3) PROD — roda só se for estável
  - stage: prod
    displayName: "Deploy PROD (stable)"
    dependsOn: classify
    condition: and(succeeded(), ne(variables['IS_RC'], 'true'))
    jobs:
      - job: deploy_prod
        steps:
          - checkout: self
          - bash: |
              if [ -f package.json ]; then
                npm ci
                npm run build || true
              fi
            displayName: "Build opcional"

          - bash: |
              mkdir -p out
              if [ -d "$(BUILD_DIR)" ]; then zip -r out/site.zip "$(BUILD_DIR)"; \
              elif [ -d html ]; then zip -r out/site.zip html; \
              else zip -r out/site.zip .; fi
            displayName: "Zip artifact"

          - task: AzureCLI@2
            displayName: "ZipDeploy (PROD)"
            inputs:
              azureSubscription: "azure-test-lab"
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                set -euo pipefail
                az webapp deploy \
                  -g azure-lab-nginx \
                  -n "$(DEPLOY_APP)" \
                  --type zip --src-path out/site.zip
```

**Notas importantes (Azure DevOps):**

- O gatilho por tags (`trigger: tags`) é parte do esquema YAML. Use _wildcards_ simples como `v*` e trate RC/estável por condição (acima).
- Também dá para checar se a execução veio de **tag** olhando `Build.SourceBranch` que, em execuções por tag, vem como `refs/tags/vX.Y.Z…`. ([FAUN.dev()][1])
- Como o **App Service Free** não tem slot, use **dois WebApps** (um QA e outro PROD) para segregar ambientes.

---

## Segredos e variáveis

- **GitHub Actions**

  - _Vercel:_ `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
  - _Azure:_ `AZURE_CREDENTIALS` (JSON do Service Principal: `clientId`, `clientSecret`, `subscriptionId`, `tenantId`).

- **Azure DevOps**

  - Service connection ARM (ex.: `azure-test-lab`) com permissão no RG.
  - Variáveis por ambiente (QA/PROD) no **Variable Group** ou `variables:` do YAML.

---

## Fluxo recomendado

1. **Tech Lead** finaliza uma release (`git flow release finish 1.4.0`) → cria **tag estável** `v1.4.0` → dispara **deploy PROD**.
2. Durante estabilização, todo push em `releases/1.4.0` cria **`v1.4.0-rc.N`** → dispara **deploy QA**.
3. Mantenha **CHANGELOG** e use as **tags** como origem da verdade para “o que exatamente está em QA/PROD”.

Se quiser, eu adapto os YAMLs acima (nomes de apps, RG, variáveis, build real do seu projeto) para já colar no seu repositório.

[1]: https://faun.pub/azure-pipelines-and-git-tag-quirks-1daaba61713a?utm_source=chatgpt.com "Azure Pipelines and Git Tag Quirks | by Dirk Avery - FAUN.dev()"
