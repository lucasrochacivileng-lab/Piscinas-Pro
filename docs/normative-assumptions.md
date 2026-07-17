# Premissas normativas

## Politica

O repositorio nao deve reproduzir texto protegido de normas. Ele registra apenas referencias bibliograficas, identificadores de clausulas, parametros necessarios ao calculo e justificativas tecnicas curtas.

Nenhum perfil deve ser marcado como apto para producao sem revisao de engenheiro habilitado, data de vigencia, jurisdicao e evidencia de origem de cada parametro.

## Estado atual

O perfil demonstrativo define somente o peso especifico da agua como entrada explicita. Ele nao contem coeficientes de combinacao, cobrimento, limites de fissuracao ou propriedades de materiais impostas por norma.

O trabalho de Silva (2022) foi incorporado como fonte academica secundaria e caso de regressao. Ele referencia, entre outras fontes, ABNT NBR 16868-1:2020 e ABNT NBR 6118:2014. A vigencia dessas edicoes e os valores normativos devem ser confirmados em fonte oficial licenciada antes de habilitar calculos de armadura ou marcar um perfil como revisado.

A consulta publica ao catalogo da ABNT realizada em 13/07/2026 nao retornou metadados especificos suficientes para confirmar o status das duas edicoes. Portanto o codigo nao as trata como vigentes.

Tambem foi observada uma provavel inconsistencia de edicao na Equacao 27 da pagina 31 do PDF: o texto diz calcular `KZ` a partir de `KX`, mas a expressao renderizada usa `KZ` dos dois lados. Essa etapa nao foi implementada.
