# Fontes da biblioteca de blocos

## Escopo

Esta nota registra como os materiais técnicos foram convertidos em dados do Poolstruct. Os arquivos servem para seleção, verificação e modulação; não substituem documentação atual do fabricante, projeto executivo nem controle de recebimento.

## ABNT NBR 6136-1:2026

Os parâmetros incorporados ao motor `phase1-1.3.0` foram transcritos da edição 2026 fornecida para o projeto, sem reprodução integral do texto normativo.

Requisitos incorporados:

- classificação explícita do bloco em Classe A, B ou C;
- Classe A com `fbk ≥ 8 MPa`, em incrementos de 2 MPa;
- Classe B com `4 MPa ≤ fbk ≤ 6 MPa`, em incrementos de 2 MPa;
- Classe C com `fbk ≥ 3 MPa`, em incrementos de 1 MPa;
- uso abaixo do nível do solo permitido somente para Classe A;
- famílias dimensionais, peças inteiras, meios blocos, frações, amarrações, compensadores e canaletas apresentadas na tabela dimensional;
- tolerâncias de largura, altura, comprimento e espessura das paredes;
- espessuras mínimas de paredes longitudinais e transversais, espessura equivalente e menor dimensão dos furos;
- raio mínimo das mísulas por classe;
- limitações de uso da Classe C conforme a largura;
- inspeção visual e aceitação do lote mantidas como verificações obrigatórias de campo.

Os parâmetros que dependem de medição ou certificado do lote permanecem com status `REQUIRES_REVIEW`. O software não transforma dado de catálogo em aprovação automática do produto fornecido.

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
- classe e `fbk` especificados e comprovados;
- controle dimensional, geometria interna, mísulas e absorção;
- inspeção visual e ensaios de aceitação;
- resistência de prisma, argamassa e graute compatíveis com o dimensionamento;
- detalhamento e responsabilidade técnica de engenheiro habilitado.
