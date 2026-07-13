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

## Proximas etapas tecnicas

- subpressao por lencol freatico;
- peso proprio de paredes e laje;
- combinacoes ELU/ELS definidas pelo perfil normativo;
- verificacao de flexao, cortante, fissuracao e armadura minima;
- validacao independente dos coeficientes e hipoteses antes de uso profissional.
