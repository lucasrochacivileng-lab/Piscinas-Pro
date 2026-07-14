# POOLSTRUCT

POOLSTRUCT e uma base de software para pre-dimensionamento e verificacao rastreavel de piscinas com paredes em alvenaria estrutural e laje de fundo em concreto armado. O objetivo e transformar entradas geometricas, materiais e perfis tecnicos versionados em memorias de calculo auditaveis.

> Estado: implementacao da Fase 3 concluida na versao `0.4.0`. O produto inclui regressao ampliada, observabilidade sanitizada, backup verificavel e procedimento de recuperacao. A liberacao profissional continua bloqueada ate auditoria e assinatura de engenheiro independente.

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
