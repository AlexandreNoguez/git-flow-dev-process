## Descrição

<!--
Explique, em poucas linhas, o que este PR faz.
Se possível, relacione com o ticket (Jira, Azure Boards, etc.).
-->

- [ ] Relacionado ao ticket: `HYP-XXX`

---

## Tipo de mudança

Marque com `x` o(s) tipo(s) de mudança:

- [ ] feat (nova funcionalidade)
- [ ] fix (correção de bug)
- [ ] docs (documentação)
- [ ] chore (infra/ci/build)
- [ ] refactor (refatoração sem mudança de comportamento)
- [ ] test (adição ou ajuste de testes)
- [ ] style (format, lint, etc. sem mudança de lógica)

---

## Checklist de Git Flow e Branch

- [ ] O nome da branch segue o padrão `feature/<TICKET>-<descricao-curta>` ou `hotfix/<versao>` ou `release/<versao>`
  - Exemplo: `feature/HYP-123-add-search`
- [ ] O PR está apontando para a branch correta:
  - [ ] Feature -> `dev`
  - [ ] Hotfix -> `main` (e depois sincronizar com `dev`)
  - [ ] Release -> `main` (apenas Tech Leads, se aplicável)
- [ ] Não há commits diretamente em `main` ou `dev` que fujam do fluxo estabelecido.

---

## Checklist de Commits (Conventional Commits)

- [ ] Todos os commits seguem o padrão **Conventional Commits**
  - Ex: `feat: add gmail OAuth button`
- [ ] Não há commits do tipo `fix tests`, `ajustes`, `WIP` sem contexto.
- [ ] Se houve necessidade de “squash”, os commits finais estão limpos e significativos.

---

## Impacto / Riscos

<!--
Descreva possíveis impactos da mudança:
- É uma mudança breaking?
- Atinge qual módulo / serviço?
-->

- [ ] Não é uma breaking change
- [ ] Pode impactar o módulo: `...`

---

## Testes

Descreva os testes realizados (manuais e automatizados):

- [ ] Testes unitários executados (descrever comandos):
- [ ] Testes de integração executados:
- [ ] Testes manuais (cenários principais):

```bash
# example
npm test
npm run test:e2e
```
