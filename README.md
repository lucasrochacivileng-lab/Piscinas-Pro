# POOLSTRUCT

POOLSTRUCT e uma base de software para pre-dimensionamento e verificacao rastreavel de piscinas com paredes em alvenaria estrutural e laje de fundo em concreto armado. O objetivo e transformar entradas geometricas, materiais e perfis tecnicos versionados em memorias de calculo auditaveis.

> Estado: Fase 1 iniciada. O nucleo atual calcula a acao hidrostatica, o empuxo ativo simplificado do solo e momentos solicitantes de paineis dentro do dominio coberto pela fonte academica. Ele nao dimensiona armaduras nem substitui a responsabilidade tecnica de um engenheiro.

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

## Limites atuais

- o fator de majoracao pode ser aplicado aos momentos, mas ainda nao existe uma verificacao completa de ELU ou ELS;
- nenhuma armadura e calculada;
- lencol freatico, sismo, temperatura e recalque ainda nao fazem parte do motor;
- coeficientes normativos permanecem bloqueados ate a incorporacao das fontes tecnicas autorizadas.
