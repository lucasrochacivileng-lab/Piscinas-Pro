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
- [x] primeiro workflow executado no GitHub;
- [ ] ambiente Supabase de staging provisionado;
- [ ] deploy de staging aprovado.

Os tres itens finais exigem infraestrutura externa e credenciais. O pipeline foi implementado para executa-los sem expor segredos assim que o repositorio for publicado e o staging configurado.

## Fase 5 - Desenhos

Status: concluida em 13/07/2026 na versao `0.6.0`.

- [x] prancha vetorial A3 gerada deterministicamente por revisao;
- [x] planta de formas e armaduras com cotas internas e externas;
- [x] corte A-A com niveis, lamina de agua, parede e laje;
- [x] elevacao da parede longa com disposicao esquematica das barras;
- [x] quadro de armaduras de paredes e laje nas duas faces e direcoes;
- [x] carimbo com projeto, local, revisao, data, perfil e status;
- [x] visualizacao responsiva e exportacao SVG no produto;
- [x] testes unitarios, seguranca de metadados e cobertura E2E da exportacao.

Os desenhos sao documentos de pre-dimensionamento academico. Detalhes de ancoragem, emendas, aberturas, juntas, impermeabilizacao e compatibilizacao executiva permanecem sob responsabilidade de engenheiro habilitado.

## Fase 6 - Modulacao

Status: biblioteca de fabricantes e triagem normativa integrada em 16/07/2026 na versao `0.9.0`.

- [x] familias de blocos academicas com coordenacao modular e canaleta;
- [x] fiadas com amarracao em contra-fiada e deslocamento de um modulo;
- [x] encontros de canto em L com alternancia de parede passante;
- [x] graute vertical por espacamento e fiadas de canaleta na base e no topo;
- [x] sugestoes de ajuste para paredes fora da modulacao;
- [x] testes do algoritmo cobrindo fiadas, paredes, encontros e determinismo.
- [x] escolha da familia no editor e persistencia por revisao;
- [x] painel visual com blocos inteiros, meios blocos, canaletas e celulas grauteadas;
- [x] verificacao da largura da parede, fechamento modular e malha de graute;
- [x] elevacao modulada na prancha e quantitativos na memoria de calculo.

A modulacao usa o metodo de eixo e serve para pre-dimensionamento academico. Amarracao detalhada, ancoragem e emenda das armaduras, cantos especiais, juntas e impermeabilizacao permanecem sob responsabilidade de engenheiro habilitado.

## Fase 7 - Geometria realista, geotecnia e representacao

Status: concluida em 18/07/2026 na versao `0.10.0`.

Entregue entre 17 e 18/07/2026, em nove pull requests:

- [x] catalogos de fabricantes e criterios normativos na biblioteca de blocos (#1);
- [x] compatibilizacao com a ABNT NBR 6136-1:2026: classes, fbk, familias nominais, paredes, tolerancias e limites da Classe C (#11);
- [x] alinhamento dos padroes imediatos ao TCC de Silva (2022) (#12);
- [x] geometria escalonada com prainha, multiplas profundidades e paredes individualizadas (#13);
- [x] integracao de SPT, flutuacao global e materiais normativos (#15);
- [x] publicacao automatica restrita a `main` (#16);
- [x] piscina com praia inclinada e lajes por zona (#17);
- [x] CAD 2D calibrado da geometria (#18);
- [x] protecao do historico e integridade do CAD 2D (#19);
- [x] requisitos fisicos de recebimento do lote: retracao por secagem e absorcao por tipo de agregado, ensaiados conforme a ABNT NBR 6136-2;
- [x] previews de branch desligados, hook de pre-push e instrucoes de agentes.

Os requisitos fisicos entram como verificacao `REQUIRES_REVIEW`: o motor registra os limites normativos, mas a conformidade depende de ensaio do lote e do certificado do fabricante.

## Proximos passos

Itens abertos que nao dependem de nova modelagem:

- [ ] parecer assinado por engenheiro independente (gate da Fase 3);
- [ ] drill de restauracao contra projeto Supabase isolado (gate da Fase 3);
- [ ] ambiente Supabase de staging e deploy de staging aprovado (gates da Fase 4);
- [ ] compatibilizacao integral com a serie ABNT NBR 6136-1:2026 vigente, hoje bloqueada por `REQUIRES_REVIEW`;
- [ ] ensaios de lote que convertam as verificacoes normativas de `REQUIRES_REVIEW` para `PASS`.
