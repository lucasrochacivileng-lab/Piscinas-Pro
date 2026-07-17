# Premissas normativas

## Política

O repositório não deve reproduzir texto protegido de normas. Ele registra apenas referências bibliográficas, identificadores de itens, parâmetros necessários ao cálculo e justificativas técnicas curtas.

Nenhum perfil deve ser marcado como apto para produção sem revisão de engenheiro habilitado, data de vigência, jurisdição e evidência de origem de cada parâmetro.

## Estado atual

O perfil estrutural principal permanece acadêmico para combinações, dimensionamento de armaduras, fissuração e propriedades globais dos materiais. Esses parâmetros ainda não devem ser apresentados como perfil normativo integral.

A biblioteca de blocos, entretanto, incorpora parâmetros objetivos fornecidos da ABNT NBR 6136-1:2026 para:

- classificação A, B e C e respectivas faixas discretas de `fbk`;
- permissão de utilização abaixo do nível do solo;
- famílias e dimensões nominais;
- tolerâncias dimensionais;
- requisitos mínimos de paredes, furos e mísulas;
- limitações de uso da Classe C;
- inspeção visual e controle de recebimento.

Verificações que dependem de medição, certificado ou ensaio do lote são emitidas como `REQUIRES_REVIEW`. A seleção de catálogo não produz aprovação automática.

O trabalho de Silva (2022) continua incorporado como fonte acadêmica secundária e caso de regressão. Ele referencia, entre outras fontes, ABNT NBR 16868-1:2020 e ABNT NBR 6118:2014. A vigência dessas edições e os valores normativos devem ser confirmados em fonte oficial licenciada antes de habilitar um perfil estrutural como revisado.

Também foi observada uma provável inconsistência de edição na Equação 27 da página 31 do PDF acadêmico: o texto diz calcular `KZ` a partir de `KX`, mas a expressão renderizada usa `KZ` dos dois lados. Essa etapa não foi implementada.
