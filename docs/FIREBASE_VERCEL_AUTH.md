# Firebase Authentication no Vercel — Nodrix Gestão

O frontend é Vite, usa `signInWithPopup(auth, googleAuthProvider)` e carrega as credenciais **públicas** de `firebase-applet-config.json`. No ambiente atual, não são necessárias variáveis `VITE_FIREBASE_*` no Vercel: o SDK utiliza esse JSON versionado.

## Configuração externa indispensável

1. Acesse o mesmo projeto Firebase do JSON: [Authentication / Settings](https://console.firebase.google.com/project/gen-lang-client-0463405815/authentication/settings).
2. Em **Authorized domains**, inclua **apenas os hostnames de produção efetivamente utilizados**, começando por `nodrix-gestao.vercel.app`, sem `https://` ou barras.
3. Em [Authentication / Sign-in method](https://console.firebase.google.com/project/gen-lang-client-0463405815/authentication/providers), confirme que Google está habilitado, com e-mail de suporte configurado.
4. Teste `https://nodrix-gestao.vercel.app` com conta já autorizada, verificando sessão e leitura do perfil no Firestore.
5. Se o console deste projeto não estiver acessível à equipe, **não crie outro Firebase nem mude o projectId silenciosamente**: é necessário assumir a titularidade do projeto / migrar conscientemente Auth, banco e regras.

**Não é preciso criar novo projeto, trocar chaves públicas ou alterar o authDomain para `vercel.app` ao usar o fluxo por popup existente.**

## Segurança — bloqueio para abertura a usuários externos

O arquivo versionado `firestore.rules` permite leitura ampla das coleções de usuários, projetos e tarefas por qualquer conta Google verificada e `AuthContext.tsx` provisiona novos perfis como `active`. **Os domínios autorizados do Firebase não são mecanismo de autorização de usuários.** Antes de distribuir este sistema interno, validar regras efetivamente implantadas no Firebase, restringir leitura/escrita a usuários previamente aprovados e evitar provisionar desconhecidos como ativos. Alterar só o arquivo local `firestore.rules` não altera as regras implantadas.

## Diagnóstico de falhas

- `auth/unauthorized-domain`: adicionar o domínio em Firebase Authentication > Settings > Authorized domains.
- `auth/operation-not-allowed`: habilitar o provedor Google.
- `auth/popup-blocked`: permitir pop-ups para o site.
- Google autentica e falha perfil: verificar projeto/databaseId Firestore e regras de acesso implantadas.
- A URL de deployment específica pode estar sob Vercel Authentication; utilizar o domínio de produção.
