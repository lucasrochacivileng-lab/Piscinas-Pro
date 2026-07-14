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

Status da implementacao: concluida em 13/07/2026 na versao `0.4.0`.

- [x] pacote e checklist para auditoria tecnica independente;
- [x] suites de regressao, golden cases e invariantes ampliadas;
- [x] observabilidade sanitizada com correlacao de incidentes;
- [x] schema operacional protegido por RLS;
- [x] backup logico com manifesto e SHA-256;
- [x] restore drill transacional e verificacao pos-recuperacao;
- [x] runbooks de operacao e resposta a incidentes;
- [ ] parecer assinado por engenheiro independente;
- [ ] drill executado contra projeto Supabase isolado.

Os dois itens finais sao gates externos: dependem, respectivamente, de um profissional independente e de credenciais/infraestrutura Supabase. Eles nao bloqueiam a conclusao da implementacao de software, mas bloqueiam a liberacao profissional.

## Fase 4 - Industrializacao e homologacao

Status: concluida em 13/07/2026 na versao `0.5.0`.

- [x] CI de qualidade, TypeScript e build;
- [x] testes E2E desktop e mobile;
- [x] migrations aplicadas em PostgreSQL descartavel no CI;
- [x] lint do banco e pgTAP como gate de pull request;
- [x] validador de release e configuracao de producao;
- [x] relatorios e traces do Playwright como artefatos;
- [x] atualizacoes automatizadas de dependencias;
- [x] politica de seguranca e checklist de homologacao;
- [ ] primeiro workflow executado no GitHub;
- [ ] ambiente Supabase de staging provisionado;
- [ ] deploy de staging aprovado.

Os tres itens finais exigem infraestrutura externa e credenciais. O pipeline foi implementado para executa-los sem expor segredos assim que o repositorio for publicado e o staging configurado.
