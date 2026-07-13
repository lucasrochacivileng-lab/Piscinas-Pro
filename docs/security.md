# Seguranca

- validar entradas tanto na interface quanto no servidor;
- rejeitar valores nao finitos, negativos ou fora dos limites operacionais documentados;
- armazenar segredos apenas em variaveis de ambiente;
- aplicar RLS e testes de isolamento entre usuarios;
- limitar tipo, tamanho e extensao real de anexos;
- registrar versao do motor e hash das entradas em cada execucao;
- apresentar falhas como erros tecnicos, nunca como aprovacao implicita.

