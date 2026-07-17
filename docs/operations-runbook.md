# Runbook de operacoes e recuperacao

## Objetivos

- RPO alvo: ate 24 horas para backups diarios; menor quando PITR estiver contratado.
- RTO alvo: ate 4 horas para restauracao logica em um novo projeto, sujeito ao volume de dados.
- Retencao recomendada: 30 copias diarias e 12 copias mensais em armazenamento criptografado fora do ambiente primario.

Os alvos devem ser medidos em drills. Eles nao constituem garantia antes da primeira restauracao cronometrada.

## Backup logico

Pre-requisitos: Node 20+, Supabase CLI via `npx`, Docker Desktop e acesso ao projeto. Nunca grave a URL do banco em arquivo versionado.

Projeto ja vinculado:

```powershell
.\scripts\backup-supabase.ps1 -Linked -OutputRoot D:\Backups\POOLSTRUCT
```

Conexao explicita:

```powershell
$env:POOLSTRUCT_DATABASE_URL = "postgresql://..."
.\scripts\backup-supabase.ps1 -OutputRoot D:\Backups\POOLSTRUCT
```

O script produz `roles.sql`, `schema.sql`, `data.sql` e `manifest.json`. O manifesto registra tamanho e SHA-256. Um backup so e considerado concluido depois de copiado para armazenamento criptografado e fora do provedor primario.

Backups do banco nao incluem os objetos do Supabase Storage; se anexos forem adicionados futuramente, eles exigirao rotina independente.

## Drill de recuperacao

Crie um projeto Supabase vazio e descartavel. Nunca aponte o drill para producao. Instale `psql`, obtenha a connection string do banco isolado e execute:

```powershell
$env:POOLSTRUCT_RECOVERY_DATABASE_URL = "postgresql://..."
.\scripts\restore-drill.ps1 `
  -BackupDirectory D:\Backups\POOLSTRUCT\20260713T120000Z `
  -ConfirmIsolatedTarget
```

O script valida todos os hashes, restaura papeis/schema/dados em uma transacao e consulta contagens essenciais e numero de tabelas com RLS. Registre inicio, termino, volume, RPO observado, RTO observado e resultado das verificacoes.

## Validacao pos-recuperacao

1. executar `npx supabase test db --db-url $env:POOLSTRUCT_RECOVERY_DATABASE_URL supabase/tests`;
2. confirmar RLS nas tabelas publicas;
3. autenticar dois usuarios de teste e provar isolamento entre projetos;
4. abrir uma revisao antiga e comparar `input_hash` e resultado;
5. criar um projeto, calcular e confirmar nova auditoria/evento operacional;
6. destruir o projeto de drill ao final e revogar suas credenciais.

## Observabilidade e incidentes

O frontend gera um UUID de correlacao e registra apenas `event_type`, `message_code`, nome da classe do erro e versao do app. O suporte deve buscar o UUID em `operational_events`; entradas e resultados estruturais nao devem ser copiados para tickets.

Uma rotina administrativa mensal deve executar `select private.prune_operational_events(now() - interval '90 days');` por conexao de manutencao. A funcao recusa retencao inferior a sete dias e nao pode ser chamada por `anon` ou `authenticated`.

Classificacao:

- SEV-1: isolamento/RLS violado, perda de dados ou resultado incorreto silencioso — bloquear uso imediatamente;
- SEV-2: calculo ou persistencia indisponivel sem perda confirmada — corrigir ou restaurar em ate 4 horas;
- SEV-3: falha visual ou exportacao com alternativa operacional — incluir na proxima manutencao.

Para SEV-1: revogar acesso afetado, preservar logs e hashes, identificar versoes do motor/perfil, notificar responsavel tecnico e nao alterar revisoes historicas. A correcao deve gerar nova revisao e teste de regressao.
