# Persistencia proposta

Entidades previstas para PostgreSQL/Supabase:

- `projects`: proprietario, nome, local e estado;
- `project_revisions`: snapshot imutavel das entradas e versao do motor;
- `calculation_runs`: perfil normativo, status, avisos e resumo;
- `calculation_artifacts`: relatorios e anexos com hash;
- `audit_events`: ator, acao, instante e metadados essenciais.

RLS deve restringir todas as linhas ao proprietario ou a membros explicitamente vinculados ao projeto. Chaves de servico nunca devem chegar ao navegador. JSONB pode armazenar snapshots versionados, mas nao deve substituir colunas consultadas com frequencia nem relacionamentos de autorizacao.

