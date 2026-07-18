# Instrucoes para agentes

Este arquivo vale para qualquer agente automatizado que trabalhe neste repositorio (Codex, Claude Code e afins). Ele descreve como entregar trabalho aqui, nao o que o produto calcula — para isso consulte `README.md` e `docs/`.

## Regra principal: um push por entrega

Commite localmente quantas vezes forem necessarias. O historico granular e util e deve ser preservado.

**Empurre uma unica vez, quando o branch estiver pronto para revisao.**

Cada `git push` dispara o CI completo (testes, TypeScript, build, Playwright, migrations, lint PostgreSQL e pgTAP), que leva cerca de dois minutos. Empurrar cada passo intermediario multiplica isso sem beneficio: uma entrega recente consumiu sete execucoes de CI para um unico resultado.

Se precisar salvar trabalho remotamente antes de terminar, use um branch descartavel e nao abra PR.

## Fluxo

1. Crie um branch a partir da `main` atualizada.
2. Trabalhe e commite localmente.
3. Rode a validacao completa (abaixo).
4. Empurre uma vez e abra o PR.

Nao empurre direto para a `main`. A `main` e producao: todo push nela publica na Vercel automaticamente.

## Antes de empurrar

```powershell
npm run release:validate
npm test
npm run check
npm run build
```

O hook `pre-push` em `.githooks/` roda `npm run check` e cancela o push se o TypeScript nao compilar. Ele e ativado pelo `npm install`; em um clone que ja tenha dependencias, rode `npm run hooks:install`. Nao contorne o hook com `SKIP_PREPUSH_CHECK=1` para entregar trabalho — ele existe justamente porque commits que nao compilavam chegaram a ser publicados.

Se o repositorio estiver em uma unidade do Google Drive, o `npm install` falha com `EBADF` e a validacao precisa acontecer fora do drive. Use `scripts/verify-local.ps1`; o hook ja faz isso sozinho.

## Nao altere sem pedido explicito

- `vercel.json`, secao `git.deploymentEnabled`. O padrao `**` desliga previews de branch e mantem apenas a `main` publicando. Cuidado: minimatch nao atravessa `/`, entao `*` nao casa com nomes como `feat/x` e a regra deixa de funcionar silenciosamente.
- `.githooks/` e `.gitattributes`. Os hooks precisam de fim de linha LF para rodar no Linux.

## Convencoes

- Commits e documentacao em portugues, seguindo o padrao `tipo: descricao` ja usado no historico.
- Versoes de `package.json` da raiz e de `apps/web` andam juntas; `npm run release:validate` falha se divergirem.
- Migrations seguem `AAAAMMDDHHMMSS_nome.sql`, em ordem cronologica e sem timestamps repetidos.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ao build do frontend. Apenas a chave publica vai para o cliente.

## Branches abandonados

Se refizer um trabalho do zero em um branch novo, feche o PR e apague o branch antigo na mesma sessao. O repositorio acumulou branches quase identicos que depois exigiram investigacao para descobrir qual valia.
