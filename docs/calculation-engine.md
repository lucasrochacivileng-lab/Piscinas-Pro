# Motor de calculo

## Convencoes

- comprimento interno: metro;
- forca: quilonewton;
- tensao/pressao: quilopascal, equivalente a `kN/m2`;
- momento por faixa: `kN.m/m`;
- peso especifico: `kN/m3`.

Entradas publicas de geometria usam milimetros para reduzir ambiguidades de formulario e sao convertidas imediatamente para SI.

## Escopo implementado

Para profundidade de agua `h` e peso especifico `gamma`:

- pressao maxima na base da parede: `p = gamma * h`;
- resultante horizontal por metro de parede: `F = gamma * h^2 / 2`;
- momento na base por metro de parede: `M = gamma * h^3 / 6`;
- pressao uniforme da agua sobre o fundo: `q = gamma * h`.

O motor tambem calcula volume de agua e capacidade aproximada em litros. Esses resultados representam somente o caso de piscina cheia e nao constituem verificacao estrutural.

## Proximas etapas tecnicas

- caso vazio com empuxo de solo;
- subpressao por lencol freatico;
- peso proprio de paredes e laje;
- combinacoes ELU/ELS definidas pelo perfil normativo;
- verificacao de flexao, cortante, fissuracao e armadura minima;
- golden tests baseados no documento tecnico fornecido.

