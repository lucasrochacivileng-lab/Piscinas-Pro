# Seguranca

- validar entradas tanto na interface quanto no servidor;
- rejeitar valores nao finitos, negativos ou fora dos limites operacionais documentados;
- armazenar segredos apenas em variaveis de ambiente;
- aplicar RLS e testes de isolamento entre usuarios;
- limitar tipo, tamanho e extensao real de anexos;
- registrar versao do motor e hash das entradas em cada execucao;
- apresentar falhas como erros tecnicos, nunca como aprovacao implicita.

## Controles implementados na Fase 2

- chave publica Supabase lida apenas de `VITE_SUPABASE_PUBLISHABLE_KEY`;
- RLS habilitada nas quatro tabelas expostas;
- propriedade baseada em `auth.uid()` e nunca em metadados editaveis do usuario;
- acesso anonimo revogado e grants minimos para usuarios autenticados;
- revisoes e execucoes sem operacoes de update/delete;
- gravacao atomica por funcao `security invoker` com `search_path` vazio;
- funcoes de trigger privadas sem permissao de execucao direta;
- auditoria de mutacoes e hash SHA-256 das entradas;
- escape de dados do projeto na memoria HTML exportada.

## Controles adicionados na Fase 3

- mensagens internas de excecao nao sao apresentadas ao usuario nem persistidas;
- cada falha recebe UUID de correlacao para suporte;
- eventos remotos aceitam apenas tipos e codigos controlados, contexto JSON de ate 4 KiB e propriedade por `auth.uid()`;
- eventos nao podem ser alterados ou excluidos pelo cliente;
- o buffer local guarda no maximo 50 eventos e nunca armazena entradas estruturais;
- dumps ficam ignorados pelo Git e recebem manifesto SHA-256;
- restore exige confirmacao explicita de banco isolado e usa transacao com `ON_ERROR_STOP`.
