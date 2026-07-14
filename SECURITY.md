# Politica de seguranca

## Versoes suportadas

Somente a versao presente em `main` recebe correcoes de seguranca durante o desenvolvimento inicial.

## Como reportar

Nao abra issue publica para vulnerabilidades. Use um GitHub Private Vulnerability Report quando o repositorio remoto estiver configurado ou contate diretamente o mantenedor por um canal privado previamente acordado.

Inclua apenas:

- versao/commit afetado;
- categoria e impacto;
- passos minimos de reproducao sem dados reais;
- mitigacao sugerida, se conhecida.

Nao envie senhas, tokens, connection strings, geometrias de clientes ou dumps de banco.

## Prioridades

- critica: quebra de RLS, exposicao de credencial, alteracao silenciosa de resultado ou perda de dados;
- alta: acesso indevido, bypass de imutabilidade ou indisponibilidade ampla;
- media: vazamento limitado de metadados ou falha com alternativa operacional;
- baixa: hardening sem exploracao demonstrada.

Falhas criticas bloqueiam deploy imediatamente. Correcoes de calculo exigem teste de regressao e nova revisao; historicos existentes nunca sao sobrescritos.
