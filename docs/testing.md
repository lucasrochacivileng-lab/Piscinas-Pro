# Estrategia de testes

1. Testes unitarios para conversoes, validacoes e equacoes puras.
2. Testes de propriedades para monotonicidade e invariantes fisicos.
3. Golden tests com exemplos tecnicos revisados e versionados.
4. Testes de contrato entre API, perfil normativo e motor.
5. Testes E2E do cadastro ate a memoria de calculo.
6. Revisao visual dos relatorios PDF renderizados antes da entrega.

Cada correcao de calculo deve incluir um teste de regressao que falhe na versao anterior.

Na conclusao da Fase 2, a suite cobre 36 testes em 11 arquivos: os 27 testes do motor, contrato estatico da migration/RLS e geracao segura da memoria de calculo. A verificacao de entrega inclui TypeScript, build Vite e um fluxo real no navegador para criar projeto, calcular e confirmar a primeira revisao.
