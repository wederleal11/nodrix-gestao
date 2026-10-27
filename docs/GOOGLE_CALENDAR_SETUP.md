# Google Calendar na agenda unificada Nodrix

## Configuração única no Google Cloud
- No projeto Google Cloud associado ao OAuth do **Firebase Auth**, habilite **Google Calendar API**.
- Configure a tela de consentimento OAuth para o escopo `https://www.googleapis.com/auth/calendar.events.readonly`.
- Enquanto o app estiver em teste, inclua as contas de teste autorizadas no consentimento Google. Em produção, conclua verificações exigidas pelo Google.
- O fluxo usa `reauthenticateWithPopup`: deve abrir o Google e solicitar **somente leitura dos eventos** na mesma conta usada para autenticar no Nodrix.

## Experiência integrada
- Acesse **Minha Semana** (modos Semana ou Mês), clique **Conectar Google** e autorize.
- Os eventos da agenda Google principal entram nos **mesmos dias** e no **mesmo painel lateral** dos eventos Nodrix, identificados discretamente por origem.
- Clique no ícone externo para abrir o compromisso no Google; exclusão na agenda Nodrix não apaga eventos Google.
- Se a API não estiver habilitada, a interface explica o erro de autorização.
- Após atualizar a página é necessário conectar novamente. Esta implementação não realiza sincronização offline nem cópia de compromissos para o banco.

## Privacidade e limites
- Tokens e compromissos Google ficam somente em memória no navegador; não são armazenados em Firestore, localStorage nem logs do Nodrix.
- A API consulta somente `primary`, em leitura, para o intervalo mostrado (inclusive recorrências expandidas).
- Novos eventos criados no Nodrix continuam apenas no Nodrix, não são automaticamente gravados no Google. Integração bidirecional exige consentimento de escrita e arquitetura de sincronização separada.
