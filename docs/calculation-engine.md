# Motor de calculo

## Convencoes

- comprimento interno: metro;
- forca: quilonewton;
- tensao/pressao: quilopascal, equivalente a `kN/m2`;
- momento por faixa: `kN.m/m`;
- peso especifico: `kN/m3`.

Entradas publicas de geometria usam milimetros para reduzir ambiguidades de formulario e sao convertidas imediatamente para SI.

## Acoes hidraulicas implementadas

Para profundidade de agua `h` e peso especifico `gamma`:

- pressao maxima na base da parede: `p = gamma * h`;
- resultante horizontal por metro de parede: `F = gamma * h^2 / 2`;
- momento na base por metro de parede: `M = gamma * h^3 / 6`;
- pressao uniforme da agua sobre o fundo: `q = gamma * h`.

O motor tambem calcula volume de agua e capacidade aproximada em litros.

## Painel de alvenaria implementado

O modulo de painel compara dois casos simplificados e sem contraforte na face oposta:

- piscina cheia: `p_water = gamma_water * h`;
- piscina vazia com solo saturado: `p_soil = gamma_sat * Ka * h`, com `Ka = tan^2(45 graus - phi/2)`.

A maior pressao maxima governa. Para paineis com `0,3 <= h/L <= 2,0`, o coeficiente de momento e interpolado linearmente entre os pontos apresentados na Tabela 4 do trabalho de Silva (2022). Os momentos sao `M_parallel = gamma_f * alpha * p_average * L^2` e `M_perpendicular = mu * M_parallel`.

O uso da pressao media transforma a distribuicao triangular em carga uniforme equivalente conforme a aproximacao do exemplo academico. A funcao rejeita paineis fora do intervalo da tabela para impedir extrapolacao silenciosa.

## Acoes globais e combinacoes

`calculatePoolLoadCases` calcula peso proprio de parede e laje, agua, sobrecarga e subpressao. O caso vazio desconta apenas o peso da laje da subpressao bruta; a estabilidade global permanece uma revisao separada.

`estimateSoilFromSPT` implementa as correlacoes academicas `phi = 28 + 0,4*NSPT` e `sigma = NSPT/5`, com conversao da tensao para kPa. O resultado e auxiliar e nunca substitui sondagem ou parecer geotecnico.

## Verificacao da alvenaria

`designMasonryPanel` calcula:

- momento resistente nao armado em ambas as direcoes;
- area de aco por momento e armadura minima;
- bitola, espacamento e area fornecida;
- cisalhamento direto e resistencia limitada;
- esbeltez armada/nao armada;
- triagem de ELS pelo dominio digitalizado da figura academica.

Falhar como alvenaria nao armada e uma verificacao diagnostica; o resultado global considera a solucao armada adotada.

## Laje de fundo

`designClampedPoolSlab` interpola os coeficientes de placa para `0,5 <= lx/ly <= 1,0`, calcula momentos positivos e negativos e cria o envelope de armadura inferior/superior sob carga descendente e subpressao.

O dimensionamento usa secao retangular de largura unitaria. A relacao `KZ = 1 - 0,4*KX` e uma correcao inferida da Equacao 27 inconsistente do PDF. Casos fora do dominio da secao sao rejeitados.

## Quantitativos e orquestracao

`calculateMaterialQuantities` calcula blocos, massa de aco, graute e concreto com fator de perdas. `runPhase1Design` integra hidrostatica, casos de carga, paredes longa/curta e laje, retornando todas as verificacoes e o estado global.

## Gate profissional

O motor esta completo para o escopo academico da Fase 1. Fissuracao/flechas da laje, estabilidade global a flutuacao e validacao normativa permanecem como `REQUIRES_REVIEW`; nunca sao convertidas silenciosamente em aprovacao.
