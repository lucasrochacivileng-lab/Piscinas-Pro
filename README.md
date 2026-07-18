# POOLSTRUCT

POOLSTRUCT e uma base de software para pre-dimensionamento e verificacao rastreavel de piscinas com paredes em alvenaria estrutural e laje de fundo em concreto armado. O objetivo e transformar entradas geometricas, materiais e perfis tecnicos versionados em memorias de calculo auditaveis.

> Estado: geometria realista, geotecnia e CAD 2D integrados na versão `0.10.0`. O usuário modela prainha, degraus e praia inclinada, escolhe fabricante, família normativa e `fbk`, e o cálculo retorna zonas de profundidade, paredes individualizadas, lajes por zona, fiadas, peças reais, canaletas, encontros, células grauteadas e verificações específicas para piscinas enterradas. Catálogo não substitui certificado e ensaios do lote.

## Requisitos

- Node.js 20 ou superior
- npm 11 ou superior

## Executar localmente

```powershell
npm install
npm test
npm run check
npm run build
npm run dev
```

### Projeto dentro do Google Drive para desktop

Algumas unidades virtuais do Google Drive rejeitam a criacao de milhares de arquivos ou links dentro de `node_modules`. Se `npm install` retornar `EBADF`, `EISDIR` ou `TAR_ENTRY_ERROR`, valide o projeto em uma copia temporaria NTFS:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

O script copia apenas os arquivos versionados para `%LOCALAPPDATA%\poolstruct\verify`, executa `npm ci`, testes, checagem e build. O repositorio Git continua em `G:`.

Para incluir os seis cenarios Playwright e instalar o Chromium isolado quando necessario:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1 -IncludeE2E
```

### Hook de pre-push

`npm install` aponta os hooks do Git para `.githooks`. O hook `pre-push` roda `npm run check` e cancela o push quando o TypeScript nao compila, para que nenhum commit quebrado chegue ao GitHub nem a Vercel. Quando o repositorio esta no Google Drive e nao consegue manter `node_modules`, o hook valida o commit em `%LOCALAPPDATA%\poolstruct\prepush`, reaproveitando as dependencias entre execucoes.

Para ativar em um clone que ja possua dependencias instaladas:

```powershell
npm run hooks:install
```

Em uma emergencia o hook pode ser ignorado com `SKIP_PREPUSH_CHECK=1 git push`.

## Estrutura

- `apps/web`: aplicacao React/Vite responsiva
- `packages/calculation-engine`: funcoes puras, unidades, validacao e rastreabilidade
- `docs`: arquitetura, premissas, seguranca, testes e roadmap
- `supabase`: migration, RLS, auditoria e testes pgTAP

## Persistencia e autenticacao

Sem configuracao externa, a aplicacao entra em modo local e salva os projetos no navegador. Para ativar autenticacao e persistencia Supabase:

1. copie `.env.example` para `apps/web/.env.local`;
2. informe `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`;
3. aplique a migration de `supabase/migrations` no projeto Supabase;
4. execute `npm run dev`.

Somente a chave publica deve ser exposta no cliente. As politicas RLS vinculam projetos, revisoes, execucoes e auditoria ao usuario autenticado.

## Capacidades da Fase 2

- login e cadastro Supabase, com modo local para desenvolvimento;
- criacao e arquivamento de projetos;
- formulario completo integrado ao motor da Fase 1;
- dashboard de resultados e verificacoes;
- revisoes imutaveis, hash SHA-256 das entradas e auditoria;
- memoria de calculo HTML autocontida e pronta para impressao;
- layout responsivo para desktop e dispositivos moveis.

## Confiabilidade da Fase 3

- matriz de regressao, golden case e invariantes fisicos;
- incidentes com UUID de correlacao, buffer local limitado e persistencia Supabase por proprietario;
- error boundary global e mensagens sem exposicao de erros internos;
- backup logico separado em papeis, schema e dados, acompanhado de manifesto SHA-256;
- restore drill transacional permitido apenas em banco isolado;
- runbooks de observabilidade, incidente, backup e recuperacao;
- pacote de auditoria independente com gates para liberacao profissional.

Consulte `docs/operations-runbook.md` antes de executar backup ou restauracao. O backup remoto exige um projeto Supabase vinculado ou `POOLSTRUCT_DATABASE_URL`; a restauracao exige `psql` e um banco vazio descartavel.

## Industrializacao da Fase 4

- GitHub Actions para testes, TypeScript, build, Playwright, migrations, lint PostgreSQL e pgTAP;
- E2E do fluxo completo, persistencia local, arquivamento, exportacao e falha correlacionada;
- matriz desktop e mobile Chromium;
- validador de release e configuracao de producao;
- Supabase CLI e Playwright fixados por versao;
- Dependabot semanal para npm e GitHub Actions;
- politica de seguranca e checklist de homologacao.

Validacao local da release:

```powershell
npm run release:validate
npm test
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Em producao, defina apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` antes de executar `npm run release:validate:production`. Nunca disponibilize `SUPABASE_SERVICE_ROLE_KEY` ao build do frontend.

## Desenhos da Fase 5

- prancha A3 `PS-01` em SVG aberto e vetorial;
- planta de formas/armaduras, corte A-A e elevacao da parede longa;
- cotas, niveis e chamadas derivados da revisao selecionada;
- quadro com armaduras das paredes e das duas faces da laje;
- carimbo rastreavel e aviso permanente de uso academico;
- visualizacao no produto e download sem dependencia de AutoCAD.

Consulte `docs/drawings.md` para convencoes, rastreabilidade e limites do desenho.

## Modulação e biblioteca técnica da Fase 6

- famílias comerciais JB e BLB, além das famílias acadêmicas legadas;
- fabricante, família dimensional da ABNT NBR 6136, faixa comercial de `fbk` e documento de origem;
- blocos inteiros, meios blocos, canaletas, meias canaletas, compensadores e peças L/T quando declaradas;
- reprovação conservadora de Classe B ou C para piscina enterrada segundo a edição 2016 fornecida;
- bloqueio `REQUIRES_REVIEW` até compatibilização integral com a série ABNT NBR 6136-1:2026 vigente;
- fiadas com amarracao em contra-fiada e deslocamento de um modulo entre elas;
- meio bloco para fechar comprimentos impares e canaleta para cinta e verga;
- encontros de canto em L com alternancia da parede passante por fiada;
- graute vertical por espacamento, cantos sempre grauteados e fiadas de canaleta na base e no topo;
- sugestoes de ajuste (reduzir, ampliar, compensar ou afinar juntas) quando a parede nao fecha no modulo;
- `modulatePoolPerimeter` retorna paredes, encontros, graute, verificacoes e memoria rastreavel.

A modulação usa o método de eixo e permanece um pré-dimensionamento. Consulte `docs/block-library-sources.md` para a rastreabilidade dos catálogos e critérios normativos.

## Capacidades da Fase 1

- geometria, volume e capacidade;
- hidrostatica, solo saturado, peso proprio, sobrecarga e subpressao;
- estimativa academica de solo por NSPT;
- casos piscina cheia e piscina vazia;
- paineis em duas direcoes ou balanco vertical;
- resistencia da alvenaria nao armada, armadura, cisalhamento, esbeltez e triagem de ELS;
- laje engastada, envelope inferior/superior e armadura nas duas direcoes;
- selecao de bitola e espacamento;
- quantitativos de blocos, aco, graute e concreto;
- orquestrador `runPhase1Design` com verificacoes `PASS`, `FAIL` e `REQUIRES_REVIEW`.

## Limites para uso profissional

- o perfil incluido e academico e permanece com status `draft`;
- fissuracao e flechas da laje exigem revisao normativa externa;
- a verificacao global contra flutuacao nao inclui solo sobre a base, ancoragens ou interacao solo-estrutura;
- sismo, temperatura, recalque e aberturas especiais nao fazem parte do motor;
- emissao de projeto continua bloqueada ate revisao por engenheiro e incorporacao de fontes normativas autorizadas.
