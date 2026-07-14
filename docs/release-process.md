# Processo de release e homologacao

## Gates obrigatorios

1. `npm ci` reproduz o lockfile sem alteracoes;
2. `npm run release:validate` confirma versoes, migrations e protecao de arquivos;
3. 49 testes Vitest aprovados;
4. TypeScript e build Vite aprovados;
5. 6 execucoes Playwright aprovadas;
6. migrations aplicadas do zero em PostgreSQL descartavel;
7. lint PostgreSQL sem erros e pgTAP aprovado;
8. revisao do diff e ausencia de segredos;
9. deploy em staging e smoke test autenticado;
10. aprovacao manual antes de producao.

Nenhuma migration deve ser aplicada manualmente pelo Dashboard. Mudancas passam por arquivos versionados e pelo pipeline.

## Segredos do staging/producao

Configure como secrets do provedor de CI/deploy:

- `SUPABASE_ACCESS_TOKEN`: somente no job de deploy de migrations;
- `SUPABASE_DB_PASSWORD`: somente no job de deploy de migrations;
- `SUPABASE_PROJECT_ID`: referencia do ambiente alvo;
- `VITE_SUPABASE_URL`: URL publica usada no build;
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave publica usada no build.

Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no job do frontend. O validador de producao falha se ela estiver presente.

## Promocao

1. pull request executa CI em banco descartavel;
2. merge em `main` gera candidato de staging;
3. migrations sao promovidas para staging por job autorizado;
4. smoke test cobre login, projeto, calculo, R1 e memoria;
5. responsavel registra commit, migration mais recente e evidencia;
6. producao recebe exatamente o commit aprovado em staging;
7. apos deploy, observar incidentes e erros por 30 minutos.

## Rollback

Migrations nao devem ser revertidas automaticamente. Em falha:

- interromper promocao;
- preservar logs, commit e migration aplicada;
- preferir migration corretiva aditiva;
- restaurar backup/PITR apenas quando houver perda ou corrupcao confirmada;
- executar novamente pgTAP, E2E e verificacao de hashes.

O frontend pode voltar ao artefato anterior desde que seu contrato continue compativel com o schema ja promovido.
