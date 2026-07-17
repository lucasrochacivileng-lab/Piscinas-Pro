# Fontes da biblioteca de blocos

## Escopo

Esta nota registra como os materiais enviados em 16/07/2026 foram convertidos em dados do Poolstruct. Os arquivos servem para pré-seleção e modulação; não substituem documentação atual do fabricante, projeto executivo nem controle de recebimento.

## ABNT NBR 6136:2016 fornecida - referência legada

A edição fornecida foi cancelada em 27/02/2026. Os critérios abaixo são mantidos como triagem conservadora e rastreável, mas o resultado inclui `current-block-standard-edition = REQUIRES_REVIEW` até conferência integral com a série ABNT NBR 6136-1:2026 vigente.

Requisitos incorporados:

- módulo básico de coordenação `M = 100 mm` e submódulos;
- distinção entre dimensões modulares, nominais e reais;
- famílias e peças da Tabela 1, incluindo inteiro, meio, amarrações L/T, compensadores e canaletas;
- Classe A: `fbk ≥ 8 MPa`; Classe B: `4 MPa ≤ fbk < 8 MPa`; Classe C: `fbk ≥ 3 MPa`;
- na edição 2016, aplicação abaixo do nível do solo exige Classe A;
- tolerâncias nominais de largura e de altura/comprimento permanecem critérios de recebimento do lote;
- identificação do lote, resistência, classe, dimensões, absorção e ensaios continuam como `REQUIRES_REVIEW`.

## TQS Alvest

O documento `tqsdocs.pdf` orientou a estrutura do cadastro:

- fabricante com identificação própria;
- famílias agrupadas por largura e modulação;
- tipos inteiro, meio, inserção T, inserção L, variável/compensador, bloco J, canaletas e peças grauteadas;
- representações distintas para fiadas ímpares, pares e células grauteadas.

O Poolstruct não reproduz arquivos ou camadas proprietárias do TQS; usa apenas a convenção conceitual para organizar os dados.

## Catálogo JB Blocos

Foram cadastradas as linhas estruturais de largura nominal 140 mm e 190 mm, ambas com altura real 190 mm e comprimentos reais 390 mm/190 mm. O catálogo declara Classes A e B, faixa comercial de 4 MPa a 20 MPa, canaletas, meias canaletas, compensadores de 90 mm e peças especiais para a linha 140 mm.

## Catálogo BLB

Foram cadastradas as famílias 15 x 30, 15 x 40 e 20 x 40 compatíveis com as Linhas 14 e 19. O catálogo declara resistência comercial de 4 MPa a 22 MPa e apresenta blocos inteiros, meios blocos, canaletas, meias canaletas, comprimentos especiais, compensadores, blocos J e blocos pilar.

## Limite de validação

`status: catalog` significa que geometria e faixa resistente foram transcritas e revisadas contra o PDF. Não significa aprovação do produto entregue. A liberação executiva depende, no mínimo, de:

- catálogo vigente e certificado do fabricante;
- identificação e rastreabilidade do lote;
- `fbk` e classe especificados e comprovados;
- controle dimensional e de absorção;
- resistência de prisma, argamassa e graute compatíveis com o dimensionamento;
- detalhamento e responsabilidade técnica de engenheiro habilitado.
