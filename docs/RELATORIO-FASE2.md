# Relatório da Fase 2: preparação para o piloto

Estado em 26/10/2026. Todo o trabalho está na branch `fase2` e no pull request para a `main` (sem merge). Só a branch **dev** do Neon foi usada; nada foi alterado na produção (sem migração na `main`, sem mudar variáveis da Vercel).

Commits, um por item, cada um com a checagem de tipos, os testes e o build passando:

| Item | Commit |
| --- | --- |
| 1. Arquivar turmas em vez de excluir | `4cc1c94` |
| 2. Desempenho | `875abb5` |
| 3. E-mail (recuperação de senha, verificação, convites) | `cd7e92b` |
| 4. Botão "Enviar pelo WhatsApp" | `a4a90b9` |
| 5. Upload de arquivos e questão "Entrega de arquivo" | `824cb06` |
| 6. Papel do banco com login próprio (`app_login`) | `7d51f17` |

A descrição completa do sistema está em [DOCUMENTACAO.md](DOCUMENTACAO.md), e os fluxos novos estão em [DIAGRAMA.md](DIAGRAMA.md) (seções 9 e 10).

## 1. O que foi feito e como

### 1.1 Turmas arquivadas (migração 0002)

- `classes.archived_at`. A turma arquivada some das listas e dos seletores (envio de atividade, agendamento), mas as aulas, a presença e os relatórios continuam. Nos relatórios, as arquivadas aparecem num grupo próprio do filtro.
- A chave estrangeira das aulas para a turma passou de `ON DELETE CASCADE` para `RESTRICT`: o banco recusa apagar uma turma que ainda tenha aulas.
- A exclusão definitiva (`deleteClassTx`) só acontece se nenhuma aula foi realizada. Numa transação, ela avisa os alunos de cada aula futura ("aula cancelada"), apaga as aulas e depois a turma. Com aula realizada, a tela pede para arquivar.
- O envio de atividade e o agendamento recusam turma arquivada também no servidor, não só na tela.

### 1.2 Desempenho

- **Início da transação em uma ida ao banco em vez de três.** Antes: `BEGIN`, `SET LOCAL ROLE app_user` e um `SELECT set_config(...)`. Agora, um comando só: `BEGIN; SELECT set_config('role','app_user',true), set_config('app.teacher_id',…,true), …`. O `set_config('role', …, true)` equivale a `SET LOCAL ROLE`, e o `true` mantém tudo restrito à transação (seguro com o PgBouncer).
- Como esse comando vai como texto, os valores passam por uma função única, `contextLiteral()` (`server/db/context-sql.ts`), que aceita só uuid, a constante `on` ou um identificador simples. Um teste tenta passar um uuid com aspas e ponto e vírgula e confirma que ele é recusado **antes de conectar**.
- **Consultas específicas** em `repo.ts`:
  - resumos de envio sem a cópia congelada, só com o número de questões e os pontos;
  - tentativas sem as respostas;
  - envios, tentativas e aulas de um aluno;
  - contagens no banco (fila de correção, contador do menu);
  - busca de questões filtrada no banco, sem conteúdo nem gabarito, com limite de 200 e aviso quando há mais.

  `rowFor`, `summarize` e `canSeeAnswers` continuam com a mesma lógica; passaram a aceitar tanto os resumos quanto os dados completos. O desempenho por habilidade, que precisa das questões, usa os dados completos só do aluno em questão (ficha e progresso).
- **Uma transação por tela** no início, alunos, ficha, questões e correção do professor, nas telas do aluno e nos dois layouts. A sessão (conta e professor) é lida numa transação só, e o segredo da sessão fica em memória depois da primeira leitura.
- `loading.tsx` nas áreas do professor e do aluno: o menu aparece na hora e o conteúdo mostra um esqueleto.
- O pool ganhou `query_timeout` (20 s) e `keepAlive`, e a conexão é devolvida ao pool antes do log de medição.

### 1.3 E-mail (migração 0003)

- `server/mail/` tem uma interface `Mailer` com três modos:
  - **SMTP** (`nodemailer`), quando existem `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`;
  - **caixa de saída** no desenvolvimento local sem SMTP: cada e-mail vira um arquivo em `.data/outbox/` e aparece em `/dev/emails` (404 em produção);
  - **desligado** na Vercel sem SMTP: nada é enviado, o log registra destinatário e assunto (sem o corpo, que tem o link de uso único) e as telas mostram uma mensagem amigável.
- Tabelas globais `auth_tokens` (só o SHA-256 do token) e `rate_limits`, além de `users.email_verified_at` e `users.session_version`. As contas que já existiam contam como verificadas.
- **Recuperação de senha:**
  - resposta igual exista ou não a conta, com o envio depois da resposta (`after()`), para o tempo de resposta não denunciar a conta;
  - limite de 3 pedidos por e-mail e 10 por IP por hora; link de 1 hora, uso único, e um pedido novo invalida os anteriores;
  - ao redefinir, a versão da sessão sobe e as outras sessões caem. Trocar a senha nas configurações e criar senha nova por convite fazem o mesmo.
- **Confirmação do e-mail do professor** no cadastro (24 h), com aviso no topo e botão "Reenviar" (3 por hora). A demonstração e o admin já nascem confirmados.
- **Convite por e-mail** na ficha do aluno, e **link de redefinição enviado pelo admin**, que vê a coluna "E-mail verificado".
- O limite de login foi para `rate_limits`. A tabela `login_attempts` ficou, sem uso, para a migração ser compatível com o código antigo.
- O IP vem de `x-vercel-forwarded-for` e depois `x-real-ip`. Sem esses cabeçalhos (fora da Vercel), o valor é "local". O primeiro valor de `x-forwarded-for` nunca é usado.

### 1.4 WhatsApp

- `lib/whatsapp.ts` monta o link `wa.me` com o texto preenchido. O telefone fica só com dígitos; números brasileiros de 10 ou 11 dígitos ganham o 55, e números que começam com `+` ou `00` mantêm o DDI. Sem telefone, o WhatsApp pergunta para quem enviar.
- Botões na ficha do aluno (convite, com a validade real do link) e na atividade, para cada aluno com envio pendente (link da atividade e prazo).

### 1.5 Upload de arquivos (migração 0004)

- **Tabelas:**
  - `files` guarda só os metadados, com `teacher_id` e RLS forçada;
  - `assignment_files` guarda as mídias do professor por envio e é preenchida ao criar o envio, a partir da cópia congelada;
  - o aluno lê só os próprios arquivos e as mídias que estão num envio atribuído a ele **e já liberado**;
  - uma mídia ligada a um envio não pode ser apagada (FK `RESTRICT`, conferido também no app).
- **Armazenamento** (`server/storage/`):
  - **Vercel Blob privado**, com `@vercel/blob` 2.8.2. O navegador envia direto ao Blob com um token de cliente restrito àquela chave, àquele tipo e àquele tamanho, por 10 minutos. O download é por URL assinada de 5 minutos;
  - **local** em `.data/uploads/`, com uma rota de upload protegida por token HMAC;
  - **desligado** na Vercel sem token.
- **Fluxo:**
  1. O navegador pede o envio.
  2. O servidor confere a permissão, o tipo e o tamanho por finalidade: imagem até 5 MB e áudio até 20 MB nas mídias; na entrega, o limite da questão, com a tentativa aberta e a questão certa.
  3. O navegador envia o arquivo direto ao armazenamento.
  4. Na confirmação, o servidor faz `head` e confere o tamanho e o tipo reais; se não baterem, apaga o arquivo.

  Uploads pendentes com mais de 24 h são limpos nos envios seguintes. Fotos são reduzidas no navegador (lado maior até 1600 px, WebP ou JPEG de qualidade média); PDF e áudio vão sem mudança.
- **Download** por `/arquivos/[id]`: consulta no escopo de quem pede e dá 404 em qualquer recusa, inclusive sem login. No modo local, o app serve o arquivo com `Content-Security-Policy: sandbox` e `nosniff`. SVG e HTML não são aceitos.
- **Novo tipo `file_upload`** ("Entrega de arquivo"), para todas as disciplinas:
  - até 5 arquivos de até 20 MB, aceitando foto, PDF ou áudio, com correção manual;
  - o servidor só aceita na resposta arquivos do próprio aluno, daquela tentativa e daquela questão, até o limite;
  - a lista dos arquivos aparece na revisão e na correção.
- **Professor:** botão "Enviar arquivo" na mídia da questão e no áudio do texto. As mídias ficam como `/arquivos/<id>?tipo=imagem|audio`, e o player reconhece o tipo.
- **LGPD:** os arquivos entram na exportação (nome, tipo, tamanho, data e endereço). Ao excluir o aluno, os objetos são apagados depois que a transação confirma; se isso falhar, cada chave vai para o log, e a exclusão no banco não é desfeita. A chave do objeto não usa o nome original.

### 1.6 Papel do banco com login próprio (só na dev)

- `npm run db:app-login` cria, como dono e pela conexão direta, o papel `app_login`:
  - `LOGIN NOINHERIT NOBYPASSRLS`, sem ser dono de nada e membro de `app_user` só com SET;
  - o script confere esses atributos antes de confirmar;
  - grava `DATABASE_APP_URL` (pelo pooler) no arquivo de ambiente, sem nunca mostrar a senha;
  - `--rotate` troca a senha.
- O app usa `DATABASE_APP_URL ?? DATABASE_URL`. Conectado como dono, ele avisa no log e mostra um aviso no painel do admin, que sempre exibe o papel conectado.
- Migrações, seed, testes e backup continuam com o dono (`DATABASE_URL_UNPOOLED`).
- Aplicado na branch dev: o `.env.local` já tem a `DATABASE_APP_URL`, e o app local roda inteiro como `app_login`.

## 2. Decisões e alternativas

- **Vercel Blob em vez de S3 ou R2:** fica no mesmo painel, o token é criado sozinho por ambiente e a versão 2.8 tem armazenamento privado, upload direto do navegador com limites definidos no servidor e URL assinada, sem configurar CORS. A interface `StorageAdapter` permite trocar depois.
- **SMTP genérico em vez de um SDK de serviço transacional:** começa com Gmail e senha de app; trocar por um serviço (Resend, SES etc.) é só mudar as variáveis.
- **O papel com login é criado por SQL, e não pelo console do Neon:** papéis criados pelo console entram no grupo `neon_superuser`, que ignora a RLS. Por isso, em vez de "criar no console e rodar um script de permissões" (como estava no plano), o script cria o papel e grava a URL. Tentei enviar ao banco só o verificador SCRAM da senha, para ela não passar em texto pelo servidor, mas o Neon recusa: ele intercepta o `CREATE ROLE` e exige a senha em texto.
- **Tabelas de autenticação sem RLS** (`auth_tokens`, `rate_limits`, como `users` e `invitations`): são procuradas pelo hash do token ou pela chave antes de qualquer login, e nenhuma tela as lista.
- **Migrações compatíveis com o código anterior** (só acrescentam colunas e tabelas; `login_attempts` fica sem uso). Assim, a produção pode ser migrada antes do merge, sem janela em que o código e o banco não combinem.
- **`submission_id` dos arquivos com `SET NULL`:** cancelar um envio apaga as tentativas, mas os arquivos continuam sendo do aluno e saem quando ele é excluído.
- **Medição:** o script de medição ficou fora do repositório. Ele sobe um `next start` local, assina um cookie de sessão com o segredo do banco e conta as idas ao banco com `DB_TRACE=1` (contador em `client.ts`, desligado por padrão).

## 3. Medições de desempenho

`next start` local, apontando para a branch dev do Neon (São Paulo). Mediana de 5 requisições por página, depois de uma de aquecimento.

- "Tempo total": resposta completa da página.
- "Transações" e "idas ao banco": soma de todas as transações da requisição.
- "Tempo em transações": soma do tempo de cada transação (elas podem rodar em paralelo).

| Página | Tempo total (ms) antes → depois | Transações | Idas ao banco | Tempo em transações (ms) |
| --- | --- | --- | --- | --- |
| /professor | 464 → 244 (−47%) | 12 → 3 | 61 → 17 | 1078 → 295 |
| /professor/alunos | 413 → 187 (−55%) | 9 → 3 | 46 → 14 | 804 → 241 |
| /professor/alunos/:id | 519 → 249 (−52%) | 12 → 3 | 61 → 17 | 1065 → 304 |
| /professor/questoes | 362 → 195 (−46%) | 8 → 3 | 41 → 14 | 755 → 244 |
| /professor/correcao | 424 → 181 (−57%) | 8 → 3 | 41 → 14 | 798 → 233 |
| /aluno | 570 → 235 (−59%) | 10 → 4 | 51 → 17 | 936 → 315 |
| /aluno/atividades | 554 → 219 (−60%) | 9 → 4 | 46 → 16 | 815 → 280 |

A medição "depois" foi feita ao fim do item 2, ainda com a conexão do dono, antes do `app_login`, que não muda o número de idas. Na Vercel (funções em gru1, na mesma região do banco), os tempos absolutos serão outros, mas a redução de idas ao banco vale igual.

## 4. Testes

`npm test`: 80 testes, todos passando.

- **19 sem banco:**
  - corretores, inclusive o da entrega de arquivo;
  - acesso ao banco, inclusive o formato do início da transação e o valor malicioso recusado;
  - WhatsApp.
- **61 de banco**, na branch dev, em schema temporário:
  - Fase 1 (isolamento, transações, entregas simultâneas etc.);
  - turmas arquivadas;
  - consultas leves;
  - e-mail: token expirado, reutilizado, inexistente e alterado; resposta igual para e-mail inexistente; limites; versão da sessão; confirmação; caixa de saída;
  - arquivos: outro aluno, outro professor e sem login recebem 404; RLS com SQL cru; tipo e tamanho; mídia antes da liberação; `RESTRICT`; exclusão do aluno apagando os objetos;
  - `app_login` pelo pooler e pela conexão direta.

Também testado no navegador, com o servidor local na branch dev:
- turma arquivada fora dos seletores;
- recuperação de senha completa pela caixa de saída: sessão antiga derrubada e link recusado na segunda vez;
- confirmação de e-mail com reenvio;
- convite por e-mail e botões de WhatsApp com a mensagem certa;
- aluno entregando uma foto: 2400 px viraram 1600 px e o PNG de 117 KB virou WebP de 47 KB;
- professora vendo o arquivo na correção;
- download com 200 para a dona e para a professora, e 404 para outra aluna, outro professor, sem login e com id inválido;
- painel do admin mostrando "conectado como app_login";
- telas no celular sem rolagem horizontal.

Os dados criados para esses testes foram apagados da dev no fim.

## 5. Problemas encontrados e pendências

**Problemas encontrados durante o trabalho (todos resolvidos):**
- **Medição travada:** a primeira medição "depois" travou porque um servidor da medição anterior tinha ficado preso na porta 3100. O script saía antes de encerrar o processo. Corrigido no script, sem relação com o app.
- **Rastreamento do projeto inteiro no build:** o Turbopack avisou que o armazenamento local fazia o pacote da função incluir o projeto todo (caminho dinâmico). Resolvido com a marcação `turbopackIgnore`.
- **Migração 0004 refeita na dev:** a primeira versão tinha uma regra que faria falhar o cancelamento de envios com arquivos (`CHECK` em conflito com o `SET NULL`). Como ela só tinha sido aplicada na dev, corrigi o arquivo e reapliquei; a `main` nunca recebeu a versão errada.
- **Consultas em paralelo na mesma conexão:** o `pg` avisa que isso deixa de funcionar na versão 9. As quatro ocorrências dentro de transações viraram consultas em sequência.
- **Commit do item 5 sem conferir o código de saída:** uma execução do teste de arquivos falhou ao carregar, antes de rodar qualquer teste, e o commit saiu porque eu conferi o texto da saída, não o código. Repeti logo depois: o arquivo passou (10 de 10) e a suíte de banco inteira passou duas vezes seguidas, 53 de 53. A falha não se repetiu; a causa provável é uma conexão passageira com o Neon. Daí em diante, todo commit conferiu o código de saída.

**Pendências:**
- **Dependências com vulnerabilidades conhecidas, anteriores à Fase 2:** o `npm audit` aponta `next` (crítica, versão 16.2.6), `zod`, `postcss`, `sharp`, `nanoid` e outras. Recomendo atualizar numa mudança própria, com teste completo, porque inclui uma versão nova do Next. O `nodemailer` da Fase 2 foi fixado na 10.1.7, que corrige as falhas das versões anteriores.
- **Telas ainda com consultas amplas:** agenda, relatórios, leituras e a lista de atividades ainda carregam tudo do professor e filtram no código.
- **Arquivos:**
  - não há antivírus;
  - mídias órfãs (que deixaram de ser usadas) não são apagadas sozinhas;
  - não há tela para o professor gerenciar as mídias;
  - fotos HEIC dependem do navegador converter.
- **Notificações por e-mail** (atividade nova, correção) não foram feitas: os e-mails desta fase são só os de conta e convite.
- **`login_attempts`** pode ser removida numa migração futura, depois que esta versão estiver em produção.
- **Os modos de produção** (Blob privado e SMTP) foram testados só pelos tipos e pela lógica, porque as contas ainda não existem. O primeiro teste real deles é o da seção 6, passo 5.

## 6. PRÓXIMOS PASSOS PARA O DESENVOLVEDOR

Na ordem. Nada disso foi feito por mim: são contas e configurações que só você pode criar.

### Passo 1. Contas a criar

**a) E-mail (Gmail com senha de app)**
1. Use (ou crie) uma conta Google só para o envio do sistema.
2. Em **Conta Google → Segurança**, ative a **verificação em duas etapas** (é exigida para senhas de app).
3. Em **Conta Google → Segurança → Senhas de app**, crie uma senha com o nome "Docentia". Ela aparece uma vez, com 16 letras: guarde sem os espaços.
4. Os valores que vão para a Vercel no passo 2:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
   - `SMTP_USER=` o endereço da conta
   - `SMTP_PASS=` a senha de app
   - `MAIL_FROM=Docentia <o endereço da conta>`
5. O Gmail aceita cerca de 500 e-mails por dia, o que é suficiente para o piloto. Para crescer, troque por um serviço transacional mudando só essas variáveis.

**b) Armazenamento (Vercel Blob)**
1. Na Vercel, no projeto: **Storage → Create Database → Blob**.
2. Crie dois stores, para não misturar arquivos de teste com os reais:
   - `docentia-arquivos`, ligado **só ao ambiente Production**;
   - `docentia-arquivos-preview`, ligado **só ao ambiente Preview**.
3. Em cada um, escolha acesso **Private** e a região mais próxima de São Paulo que estiver disponível.
4. Ao ligar o store ao projeto, a Vercel cria a variável `BLOB_READ_WRITE_TOKEN` no ambiente escolhido. Não é preciso copiar nada.

### Passo 2. Variáveis na Vercel

Em **Settings → Environment Variables**, marque as que têm senha como **Sensitive**.

| Variável | Preview | Production |
| --- | --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Opcional (a mesma conta serve; sem elas, o e-mail fica desativado com aviso) | Sim |
| `BLOB_READ_WRITE_TOKEN` | Criada pelo store de Preview | Criada pelo store de Production |
| `DATABASE_APP_URL` | Sim: o valor de `DATABASE_APP_URL` do seu `.env.local` (papel `app_login` da branch dev) | Só no passo 4 |
| `APP_URL` | Não (o endereço do deploy é usado) | Já existe (`https://app-docentia.vercel.app`) |

Não mexa em `DATABASE_URL` nem nas variáveis da integração Neon. Depois de salvar, faça um novo deploy (**Deployments → … → Redeploy**) para as variáveis valerem.

### Passo 3. Migrações 0002, 0003 e 0004 na main

São compatíveis com o código que está no ar, então podem ser aplicadas antes do merge.
1. Crie de novo o arquivo temporário `.env.producao.local` com `DATABASE_URL` e `DATABASE_URL_UNPOOLED` da branch **main** (como na Fase 1) e confira que o nome do arquivo e o host estão certos.
2. Faça o backup:

   ```bash
   npm run db:backup -- --env-file=.env.producao.local
   ```

3. Rode as migrações:

   ```bash
   npm run db:migrate -- --env-file=.env.producao.local --confirmar
   ```

   O esperado é "aplicada 0002_classes_archive", "aplicada 0003_auth_email" e "aplicada 0004_files".
4. Faça o merge do pull request da `fase2` (merge commit) e confira o deploy de produção.

### Passo 4. Papel com login na main

1. Com o mesmo `.env.producao.local`:

   ```bash
   npm run db:app-login -- --env-file=.env.producao.local --confirmar
   ```

   O script cria o papel `app_login` na main e grava `DATABASE_APP_URL` no próprio arquivo. A senha não aparece na tela.
2. Abra o arquivo, copie o valor de `DATABASE_APP_URL` e crie a variável `DATABASE_APP_URL` (Sensitive) **só em Production** na Vercel. Depois, faça um novo deploy.
3. Entre como admin em https://app-docentia.vercel.app/admin e confira o subtítulo "conectado como app_login", sem o aviso amarelo.
4. **Apague o `.env.producao.local`.**
5. **Não crie esse papel pelo console do Neon:** papéis criados por lá ignoram a RLS.
6. Se algum dia precisar trocar a senha: `npm run db:app-login -- --env-file=<arquivo> --confirmar --rotate` e atualize a variável na Vercel.

### Passo 5. Testes a fazer em produção (com uma conta de teste sua, não com alunos reais)

1. **Recuperação de senha:** em `/recuperar-senha`, peça um link para o seu e-mail de professor e confira a chegada (e a caixa de spam). Redefina a senha e confira que uma sessão aberta em outro navegador caiu.
2. **Confirmação de e-mail:** crie uma conta de professor de teste, confirme pelo e-mail e veja o aviso sumir. No `/admin`, confira a coluna "E-mail verificado".
3. **Admin:** no `/admin`, use "Enviar link de redefinição" na conta de teste.
4. **Convite:** cadastre um aluno de teste com um e-mail seu, use "Enviar por e-mail" e "Enviar pelo WhatsApp" e ative a conta pelo link.
5. **Mídia:** crie uma questão com imagem enviada por "Enviar arquivo" e outra de "Entrega de arquivo". Monte uma atividade e envie ao aluno de teste.
6. **Entrega:** como aluno, no celular, anexe uma foto e um PDF e entregue. Como professor, baixe os arquivos na correção e dê a nota.
7. **Permissão:** abra o endereço `/arquivos/...` de um arquivo numa janela anônima (deve dar 404) e logado como outro professor de teste (deve dar 404).
8. **Turmas:** arquive uma turma de teste e confira que ela some dos seletores. Exclua uma turma sem aulas realizadas.
9. **Limpeza:** exclua o aluno de teste e confira, no store Blob, que os arquivos dele sumiram.
10. **Logs:** no log da Vercel, confira que não aparece `[db] AVISO` (o app não está conectado como dono) nem `[mail] AVISO`.
