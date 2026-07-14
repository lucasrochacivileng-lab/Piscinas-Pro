# Aceite da Fase 1

Versao: `0.2.0`
Motor: `phase1-1.0.0`
Data: 13/07/2026

## Entregas aceitas

1. Todas as entradas numericas do fluxo principal sao validadas.
2. Unidades internas e saidas sao explicitas.
3. Casos de agua, solo, peso proprio, sobrecarga e lencol freatico sao calculados.
4. A estimativa auxiliar por NSPT retorna angulo de atrito e tensao admissivel com unidades explicitas.
5. Paredes usuais usam tabela bidirecional ou balanco vertical conforme `h/L`.
6. Alvenaria retorna resistencias, armaduras, cisalhamento, esbeltez e triagem de ELS.
7. Laje retorna momentos e armaduras para faces inferior e superior nas duas direcoes.
8. Quantitativos retornam blocos, aco, graute e concreto com perdas configuraveis.
9. Cada resultado critico possui verificacao e, quando aplicavel, rastro de equacao.
10. O exemplo de Silva (2022) permanece como golden test.
11. O fluxo integrado compila e passa na suite automatizada.

## Regra de status

- `PASS`: demanda atendida dentro do modelo implementado;
- `FAIL`: verificacao governante nao atendida;
- `REQUIRES_REVIEW`: a fonte academica nao e suficiente para aprovacao profissional ou a verificacao depende de modelo externo.

Falhas de uma alternativa descartada, como alvenaria nao armada quando a solucao armada atende, sao preservadas como diagnostico e marcadas como nao governantes.

## Exclusoes conscientes

- nenhum perfil incluido possui status normativo `reviewed`;
- nao existe emissao de ART, aprovacao ou responsabilidade tecnica automatica;
- nao sao verificados sismo, temperatura, recalques, aberturas, juntas ou interacao solo-estrutura avancada;
- fissuracao e flecha da laje permanecem sujeitas a verificacao normativa licenciada;
- a tabela de lajes nao e extrapolada fora do intervalo da fonte.

Essas exclusoes sao gates de seguranca e nao resultados omitidos silenciosamente.
