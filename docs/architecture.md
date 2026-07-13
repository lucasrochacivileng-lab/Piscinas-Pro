# Arquitetura

## Objetivo

O POOLSTRUCT deve produzir resultados reproduziveis e explicaveis para o pre-dimensionamento de piscinas de concreto armado. Cada resultado numerico precisa informar entradas, unidade, equacao e origem tecnica.

## Principios

1. O motor de calculo e independente da interface e do banco de dados.
2. Unidades entram pelas fronteiras e sao normalizadas para SI internamente.
3. Perfis normativos sao dados versionados, nunca constantes dispersas.
4. Calculos sao funcoes puras e retornam rastros auditaveis.
5. Resultados incompletos sao identificados explicitamente, sem falsa aprovacao estrutural.

## Componentes previstos

- `calculation-engine`: geometria, acoes, combinacoes e verificacoes;
- `normative-profiles`: parametros e referencias versionadas;
- `reporting`: memoria de calculo e exportacao;
- `web`: cadastro, revisao das entradas e visualizacao;
- `persistence`: projetos, revisoes e trilha de auditoria no PostgreSQL/Supabase.

## Fluxo principal

1. O usuario informa geometria, materiais, solo e condicoes de exposicao.
2. A aplicacao valida e converte as unidades.
3. O motor cria casos de carga e executa verificacoes disponiveis.
4. A interface exibe resultados, hipoteses, alertas e rastreabilidade.
5. Uma revisao imutavel do calculo pode ser persistida e exportada.

