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

## Modulacao (Fase 6)

O modulo `modulation.ts` distribui a alvenaria em blocos e serve para pre-dimensionamento academico. As entradas sao nominais em milimetros (bloco real + junta).

### Famílias de blocos

Uma `BlockFamily` define fabricante, família dimensional da ABNT NBR 6136, módulo de amarração, malha básica de coordenação, altura de fiada, largura nominal, junta, faixa de resistência e peças. Exige inteiro, meio, canaleta inteira e meia canaleta. Compensadores, amarrações L/T, blocos J e especiais são preservados quando declarados no catálogo.

A biblioteca inclui famílias JB e BLB extraídas dos catálogos enviados e mantém `BLOCK_FAMILY_M20` e `BLOCK_FAMILY_M15` apenas para compatibilidade com revisões acadêmicas antigas. Como triagem conservadora da edição 2016 fornecida, `runPhase1Design` reprova qualquer seleção abaixo da Classe A (`fbk < 8 MPa`). A edição 2016 foi cancelada em 27/02/2026; por isso a compatibilização com a série ABNT NBR 6136-1:2026 permanece `REQUIRES_REVIEW`. A faixa de catálogo é verificada separadamente da aceitação do lote.

### Fiadas e amarracao

`layoutCourse` preenche uma fiada por amarração em contra-fiada: a fiada base começa com bloco inteiro e a contra-fiada começa com meio bloco, deslocando as juntas verticais em um módulo. Comprimentos ímpares fecham com meio bloco. Nas cintas, o algoritmo seleciona a canaleta de comprimento correspondente, inclusive meia canaleta, em vez de apenas renomear o bloco comum.

### Encontros

`modulatePoolPerimeter` resolve os quatro cantos de uma piscina retangular como encontros em L, alternando qual parede passa pelo canto entre a fiada e a contra-fiada. Quando o catálogo declara bloco L ou T, a peça é identificada no plano de encontro; quando não declara, a saída exige o detalhamento pela alternância de fiadas. Os comprimentos de assentamento são tomados pelo eixo das paredes (`L_interno + t`).

### Graute

O graute vertical e posicionado pelo espacamento das armaduras, com cantos sempre grauteados de forma continua. As fiadas de canaleta ficam na base e no topo e, opcionalmente, a cada `bondBeamCourseSpacing` fiadas, recebendo o graute horizontal da cinta.

### Sugestoes de ajuste

Quando a parede nao fecha no modulo, `suggestModularAdjustments` propoe reduzir para o modulo inferior, ampliar para o superior, absorver o residuo com peca de compensacao existente na familia ou distribuir o residuo nas juntas quando ficar dentro de 3 mm por junta. Paredes fora do modulo aparecem como `REQUIRES_REVIEW`, nunca como aprovacao silenciosa.

## Gate profissional

O motor esta completo para o escopo academico das Fases 1 e 6. Fissuracao/flechas da laje, estabilidade global a flutuacao, amarracao detalhada e validacao normativa permanecem como `REQUIRES_REVIEW`; nunca sao convertidas silenciosamente em aprovacao.
