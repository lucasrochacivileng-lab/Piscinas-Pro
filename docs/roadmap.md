# Roadmap

## Fase 0 - Fundacao

- arquitetura, limites de responsabilidade e modelo inicial;
- estrategia normativa, seguranca e testes.

## Fase 1 - Nucleo de calculo

Status: concluida em 13/07/2026 no escopo academico da versao `0.2.0`.

- [x] unidades e validacao;
- [x] geometria, carga hidrostatica, peso proprio e sobrecarga;
- [x] empuxo de solo e subpressao;
- [x] estimativa auxiliar de solo por NSPT;
- [x] casos de parede em duas direcoes e balanco vertical;
- [x] flexao, armadura, cisalhamento, esbeltez e triagem de ELS da alvenaria;
- [x] laje engastada, envelope cheio/vazio e armadura em ambas as faces;
- [x] quantitativos de blocos, aco, graute e concreto;
- [x] perfil tecnico versionado e golden test academico;
- [x] orquestrador da Fase 1 e estados de verificacao auditaveis.

O gate para uso profissional nao faz parte da conclusao academica: requer fontes normativas licenciadas, revisao independente e perfil com status `reviewed`.

## Fase 2 - Produto

Status: concluida em 13/07/2026 na versao `0.3.0`.

- [x] aplicacao React/Vite responsiva;
- [x] autenticacao Supabase e modo local de desenvolvimento;
- [x] cadastro e arquivamento de projetos;
- [x] formulario integrado ao motor estrutural;
- [x] dashboard de resultados e verificacoes;
- [x] revisoes imutaveis com hash SHA-256;
- [x] migration PostgreSQL, RLS, grants minimos e auditoria;
- [x] memoria de calculo HTML exportavel e pronta para impressao.

A aplicacao da migration em ambiente remoto depende das credenciais do projeto Supabase e nao faz parte do repositorio local.

## Fase 3 - Confiabilidade

- auditoria tecnica externa;
- suites de regressao ampliadas;
- observabilidade, backup e recuperacao.
