# Nodrix Gestão: liberação das regras de autorização

## Contas proprietárias
Identidades Google verificadas: `wederleal11@gmail.com` e `weder.leal@nodrix.com.br`. A perspectiva de um colaborador não altera os direitos do usuário autenticado.

## Publicação obrigatória no backend (separada do Vercel)
A atualização da `main` NÃO publica as regras Cloud Firestore automaticamente.
Antes de validar ações de gestor pela conta corporativa, um administrador Firebase deve
publicar o arquivo `firestore.rules` deste commit no projeto
`gen-lang-client-0463405815`, especificamente no banco NOMEADO
`ai-studio-nodrixgesto-1c983e82-bfa7-44e9-ad7d-a026ac022014`.
Conferir o alvo no Console Firestore antes da publicação: não aplicar em `(default)` por engano.

## Aceite funcional
- Login da conta corporativa Google, criação de novo projeto com opções vazias e ID único.
- Editar o projeto existente sem duplicá-lo, alterar seu status e observar a atualização.
- Cadastrar e editar colaborador; confirmar que não há campos indefinidos.
- Minha Semana mostra somente tarefas e eventos atribuídos ao UID autenticado; Demandas permite ver a equipe.
- Confirmar na prática a negação de escrita administrativa aos demais colaboradores.
- Testar exclusão e reentrada: excluir documento não remove conta do Firebase Authentication.
