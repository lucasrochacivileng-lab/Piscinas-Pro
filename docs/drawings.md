# Desenhos estruturais

## Escopo

A Fase 5 transforma cada revisao imutavel em uma prancha vetorial A3, identificada como `PS-01`. O SVG e construido diretamente a partir da mesma entrada e do mesmo resultado salvos na revisao; por isso cotas, armaduras, perfil tecnico e status permanecem rastreaveis.

A prancha contem:

- planta de formas e armaduras da laje;
- linha e identificacao do corte A-A;
- corte transversal com lamina de agua, niveis, parede e laje;
- elevacao esquematica da parede longa;
- quadro de armaduras das paredes longa/curta e laje inferior/superior;
- carimbo com projeto, local, revisao e data.

## Convencoes

- dimensoes lineares sao apresentadas em milimetros;
- niveis do corte sao apresentados em metros a partir da lamina de agua `N.A. +/-0,00`;
- chamadas de armadura usam `diametro c/ espacamento`;
- linhas laranja representam barras calculadas;
- hachuras diferenciam concreto e alvenaria;
- a escala grafica e ajustada ao espaco da vista, sem declarar uma escala nominal de impressao.

As convencoes foram informadas pelo fluxo e pelas figuras do TCC fornecido pelo autor do projeto, sem copia de pranchas ou templates protegidos. A implementacao nao depende de AutoCAD e produz SVG aberto.

## Determinismo e seguranca

O gerador nao usa relogio atual, identificadores aleatorios ou rede. A mesma revisao produz exatamente os mesmos bytes. Nome e local do projeto sao escapados antes de entrar no XML; o arquivo nao incorpora scripts, links ou recursos externos.

## Limites

A prancha nao e projeto executivo e nao deve ser liberada para obra sem revisao e responsabilidade tecnica. A Fase 5 nao detalha:

- comprimentos de ancoragem, emendas e ganchos;
- encontros de canto e grauteamento construtivo;
- juntas, impermeabilizacao, ralos, tubulacoes ou aberturas;
- fundacao, interacao solo-estrutura e recalques;
- lista de corte, peso individual e quantitativos executivos;
- assinaturas, ART/RRT ou selo de aprovacao profissional.
