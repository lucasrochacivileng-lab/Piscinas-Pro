# POOLSTRUCT

POOLSTRUCT e uma base de software para pre-dimensionamento e verificacao rastreavel de piscinas com paredes em alvenaria estrutural e laje de fundo em concreto armado. O objetivo e transformar entradas geometricas, materiais e perfis tecnicos versionados em memorias de calculo auditaveis.

> Estado: Fase 1 concluida no escopo academico. O nucleo v0.2.0 executa cargas, paredes, laje, armaduras e quantitativos com rastreabilidade. Perfis academicos retornam `REQUIRES_REVIEW` e nao substituem a responsabilidade tecnica de um engenheiro.

## Requisitos

- Node.js 20 ou superior
- npm 11 ou superior

## Executar localmente

```powershell
npm install
npm test
npm run check
npm run build
```

### Projeto dentro do Google Drive para desktop

Algumas unidades virtuais do Google Drive rejeitam a criacao de milhares de arquivos ou links dentro de `node_modules`. Se `npm install` retornar `EBADF`, `EISDIR` ou `TAR_ENTRY_ERROR`, valide o projeto em uma copia temporaria NTFS:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

O script copia apenas os arquivos versionados para `%LOCALAPPDATA%\poolstruct\verify`, executa `npm ci`, testes, checagem e build. O repositorio Git continua em `G:`.

## Estrutura

- `packages/calculation-engine`: funcoes puras, unidades, validacao e rastreabilidade
- `docs`: arquitetura, premissas, seguranca, testes e roadmap
- `src`: reservado para a aplicacao web
- `supabase`: reservado para migrations e configuracao local

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
