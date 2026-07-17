# Estrategia de testes

1. Testes unitarios para conversoes, validacoes e equacoes puras.
2. Testes de propriedades para monotonicidade e invariantes fisicos.
3. Golden tests com exemplos tecnicos revisados e versionados.
4. Testes de contrato entre API, perfil normativo e motor.
5. Testes E2E do cadastro ate a memoria de calculo.
6. Revisao visual dos relatorios PDF renderizados antes da entrega.

Cada correcao de calculo deve incluir um teste de regressao que falhe na versao anterior.

Na implementacao da Fase 3, a suite cobre regressao integrada, golden case residencial, determinismo, monotonicidade hidrostatica, matriz operacional sem valores nao finitos, observabilidade sem vazamento de mensagens brutas e contratos das duas migrations. A verificacao de entrega inclui TypeScript, build Vite, parse dos scripts PowerShell e fluxo real no navegador.

Os testes pgTAP em `supabase/tests` devem ser executados com `npx supabase test db` em uma stack local ativa ou projeto de teste vinculado. Esse gate exige Docker ou credenciais de um banco descartavel.

## Matriz da Fase 4

- Vitest: 53 testes de motor, regressao, observabilidade, relatorio, desenhos e contratos SQL;
- Playwright: 3 cenarios em desktop Chromium e Pixel 7, totalizando 6 execucoes;
- PostgreSQL CI: migrations, `db lint --fail-on error`, advisors e 27 assercoes pgTAP;
- release: sincronismo de versoes, dependencias fixadas, migrations ordenadas e protecao de segredos;
- browser: traces, videos e screenshots preservados somente em falhas.

No CI, Playwright usa um worker para reduzir flakiness. O job do banco e separado do job de produto para indicar com clareza se a falha ocorreu no schema ou na aplicacao.

## Matriz da Fase 5

- determinismo byte a byte da prancha SVG;
- presenca de planta, corte, elevacao, quadro de armaduras e carimbo;
- propagacao de geometria e armaduras calculadas;
- rejeicao de `NaN`, `Infinity` e valores indefinidos no XML;
- escape de nome e local informados pelo usuario;
- E2E de visualizacao, download, nome do arquivo e conteudo da revisao R1.
