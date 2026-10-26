# Imagens em demandas — configuração necessária

Os anexos agora usam o Firebase Storage (bucket indicado em `firebase-applet-config.json`),
enquanto o Firestore nomeado mantém SOMENTE metadados e caminhos do arquivo.
A publicação das regras do Firestore **não** publica regras do Storage.

## Para habilitar
1. Abrir [Firebase Console — Storage](https://console.firebase.google.com/project/gen-lang-client-0463405815/storage).
2. Ativar o bucket `gen-lang-client-0463405815.firebasestorage.app` se ainda não existir.
   O Firebase pode exigir configuração de cobrança para criar/usar o Storage.
3. Em **Storage → Regras**, publicar o conteúdo versionado de `storage.rules`.
   Não substituir o arquivo `firestore.rules`: são dois produtos diferentes.
4. Testar com login Google: colar screenshot no formulário, upload por arquivo,
   arrastar na área, salvar, reabrir, ver as miniaturas e remover um anexo próprio.
5. Testar um usuário não autenticado: leitura e escrita de objetos devem ser negadas.

## Segurança e limites
- JPG, PNG, WebP, GIF; até 6 MiB por imagem; máximo 12 por demanda.
- Nome aleatório no caminho, arquivos armazenados sob UID do autor.
- Download permitido somente a usuários com login Google verificado; exclusão do
  objeto restrita ao uploader; o front não armazena URLs com tokens no Firestore.
- **Limite conhecido:** as regras do Cloud Storage não verificam diretamente o
  status/ACL da conta no Firestore nomeado do Nodrix. Uma conta Google previamente
  autorizada mas posteriormente desativada pode conservar acesso ao Storage.
  Para isolamento estrito, implantar um backend que valide sessão/permissões
  no Firestore nomeado e sirva/assine uploads e downloads antes de expor o módulo
  para dados altamente confidenciais.
- URLs de download Firebase podem ser compartilhadas e contêm tokens; trate-as
  como links sensíveis e evite compartilhá-las externamente.
- Ao apagar uma demanda, objetos antigos no Storage podem exigir limpeza
  privilegiada programada. Exclusão da metadata por si só não apaga o objeto.
