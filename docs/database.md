# Persistencia da Fase 2

Entidades implementadas em PostgreSQL/Supabase:

- `projects`: proprietario, nome, local e estado;
- `project_revisions`: snapshot imutavel das entradas e numero sequencial;
- `calculation_runs`: versoes do motor e perfil, hash, status, avisos, resumo e resultado completo;
- `audit_events`: ator, acao, instante e metadados essenciais.

RLS restringe todas as linhas ao proprietario autenticado. As tabelas revogam acesso de `anon`, usam grants explicitos para `authenticated` e nao permitem alteracao ou exclusao de revisoes e execucoes. A funcao `save_calculation_revision` grava snapshot e resultado na mesma transacao e bloqueia o projeto durante a numeracao da revisao.

Triggers privados registram insercoes, alteracoes e exclusoes relevantes em `audit_events`. Chaves de servico nunca chegam ao navegador. JSONB e usado somente para snapshots e resultados versionados; propriedade, status, versoes e relacionamentos de autorizacao permanecem em colunas tipadas e indexadas.

A migration esta em `supabase/migrations/20260714000330_phase2_product_schema.sql`. O teste pgTAP de contrato esta em `supabase/tests/phase2_schema.sql`; testes estaticos adicionais rodam com Vitest.
