# Pacote para auditoria tecnica independente

## Escopo auditavel

- motor em `packages/calculation-engine`;
- perfil `silva-2022-phase1-academic` e rastreabilidade das fontes;
- casos de carga, paredes, alvenaria e laje;
- estados `PASS`, `FAIL` e `REQUIRES_REVIEW`;
- persistencia imutavel, hash das entradas e memoria de calculo;
- migrations, RLS, grants, auditoria e observabilidade;
- backup, restauracao e resposta a incidentes.

## Evidencias entregues ao auditor

1. PDF academico de referencia e `docs/sources.md`;
2. premissas em `docs/normative-assumptions.md`;
3. equacoes e limites em `docs/calculation-engine.md`;
4. suites automatizadas e golden cases;
5. migrations e testes pgTAP;
6. tres memorias de calculo representativas;
7. evidencia de isolamento entre dois usuarios;
8. relatorio do primeiro restore drill.

## Checklist de parecer

- [ ] fontes normativas autorizadas e versoes identificadas;
- [ ] combinacoes e coeficientes revisados independentemente;
- [ ] unidades, sinais e envelopes conferidos manualmente;
- [ ] limites de aplicacao e mensagens de bloqueio adequados;
- [ ] ao menos tres casos recalculados por ferramenta independente;
- [ ] erros relativos documentados e dentro da tolerancia aprovada;
- [ ] RLS testada com usuarios distintos;
- [ ] backup restaurado em ambiente isolado;
- [ ] riscos residuais aceitos pelo responsavel tecnico;
- [ ] nome, registro profissional, data e assinatura do auditor.

## Achados internos antes do parecer

| Severidade | Achado | Tratamento |
|---|---|---|
| Bloqueador | Perfil estrutural ainda e academico e `draft`. | Impedir alegacao de uso profissional ate perfil normativo revisado. |
| Alto | A combinacao usa fator academico unico. | Auditor deve substituir por combinacoes normativas versionadas. |
| Alto | Flechas, fissuracao e estabilidade global nao estao completas. | Manter `REQUIRES_REVIEW` e ampliar motor antes do uso profissional. |
| Medio | Memoria HTML nao possui assinatura digital. | Preservar hash e adicionar artefato assinado em fase futura. |
| Medio | Migration ainda nao foi exercitada em projeto remoto deste repositorio. | Executar pgTAP, advisors e isolamento no ambiente de homologacao. |

Nao foram identificados bloqueadores para uso academico controlado. Este documento nao e um parecer externo e nao substitui a assinatura do engenheiro independente.
