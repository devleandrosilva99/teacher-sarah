# Documentação do sistema: Docentia

Estado em 26/10/2026 · em produção em https://app-docentia.vercel.app (Fase 1: PostgreSQL e disciplinas). Este documento já descreve a **Fase 2** (preparação para o piloto: turmas arquivadas, desempenho, e-mail, WhatsApp, upload de arquivos e papel do banco com login próprio), que está no pull request da branch `fase2` e ainda não foi para a produção. Os diagramas das telas, dos fluxos e das tabelas estão em [DIAGRAMA.md](DIAGRAMA.md); o que mudou em cada fase está em [RELATORIO-FASE1.md](RELATORIO-FASE1.md) e [RELATORIO-FASE2.md](RELATORIO-FASE2.md).

## 1. O que é

Plataforma web para **professores de inglês** acompanharem seus alunos. Cada professor tem um espaço isolado, com disciplinas, alunos, turmas, banco de questões, atividades, correção, agenda e relatórios, além de uma página própria (`/p/nome-do-professor`) com a cor da sua marca. O aluno entra por convite do professor e vê só o que o professor passou para ele.

O nome da plataforma é **Docentia**, definido em `lib/brand.ts`, que é de onde todas as telas o leem. **Histórico:** o projeto começou como o protótipo "Teacher Sarah", de uma única professora, e foi reescrito como sistema para vários professores. A professora Sarah continua nos dados de demonstração como personagem; o repositório, a pasta e o pacote mantêm o nome antigo.

**Estágio atual:** protótipo funcional, pronto para piloto. Todas as telas estão implementadas e os fluxos principais foram testados no navegador. Hospedagem: Vercel. Banco: PostgreSQL no Neon, com o isolamento entre professores garantido pelo próprio banco (Row Level Security).

**Disciplinas:** o sistema já separa o conteúdo por disciplina. Cada professor começa com **Inglês**, criada a partir de um modelo com as habilidades (leitura, gramática, vocabulário, escrita, compreensão auditiva) e os níveis A1–C2. A estrutura está pronta para outras disciplinas e tipos de questão específicos, mas por enquanto só existe o modelo de inglês.

**Público:** professores autônomos de inglês, com aulas particulares ou pequenas turmas, online ou presenciais, e seus alunos, adolescentes e adultos (menores de idade são permitidos com autorização do responsável). Interface em português; o conteúdo das questões fica em inglês.

## 2. Perfis e permissões

| Perfil | Como entra | Pode | Não pode |
| --- | --- | --- | --- |
| Professor | Autocadastro em `/cadastro` (e-mail e senha), com confirmação do e-mail por link | Tudo sobre os próprios alunos, turmas, questões, atividades, correção, agenda e relatórios; personalizar sua página | Ver qualquer dado de outro professor |
| Aluno | Convite do professor: link `/convite/[token]`, uso único, vale 7 dias (o professor copia o link, manda pelo WhatsApp ou por e-mail) | Ver e fazer atividades atribuídas a ele, inclusive enviando arquivos; ver notas, aulas e progresso; editar o telefone; trocar ou recuperar a senha; exportar os dados; pedir a exclusão | Ver outros alunos ou os arquivos deles; ver gabarito antes da hora; criar conteúdo; ver as anotações privadas do professor |
| Administrador | Criado pelas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` | Ver professores, contagens e se o e-mail foi confirmado; bloquear ou desbloquear; mandar ao professor um link de redefinição de senha; ver com qual papel o app está conectado ao banco | Ver dados pessoais e respostas dos alunos; ver ou definir a senha de alguém |

- A conta de login (tabela `users`) é separada do cadastro do aluno feito pelo professor (tabela `students`). Por enquanto, cada aluno pertence a **um** professor: quem tem aula com dois professores precisa de duas contas, com e-mails diferentes. A separação deixa pronta a unificação de contas no futuro.
- Se um professor é bloqueado, ele e os alunos dele perdem o acesso.
- Um aluno arquivado não consegue entrar, mas o histórico dele é mantido.

## 3. Funcionalidades

### 3.1 Público

- **Página inicial** (`/`): apresentação da plataforma e botões "Criar conta de professor" e "Sou aluno". Quem já está logado vai direto para a sua área.
- **Entrar** (`/entrar`): login único para os três perfis, com limite de 5 tentativas erradas a cada 15 minutos por e-mail. Mensagens específicas para conta arquivada ou bloqueada. Link "Esqueci minha senha".
- **Recuperar senha** (`/recuperar-senha`): a pessoa informa o e-mail e recebe um link para criar uma senha nova. A resposta é sempre a mesma, exista ou não a conta. Limite de 3 pedidos por e-mail e 10 por IP a cada hora.
- **Nova senha** (`/redefinir-senha/[token]`): o link vale 1 hora e uma vez só; pedir um novo invalida os anteriores. Ao salvar, as outras sessões abertas da conta são encerradas e a pessoa já entra com a sessão nova.
- **Confirmar e-mail** (`/verificar-email/[token]`): link enviado ao professor no cadastro, válido por 24 horas.
- **Cadastro de professor** (`/cadastro`): nome, e-mail e senha (mínimo de 8 caracteres), com aceite obrigatório dos termos. O endereço público (slug) é gerado a partir do nome. Logo depois, o professor recebe o e-mail de confirmação; até confirmar, vê um aviso no topo com o botão "Reenviar" (até 3 por hora).
- **Caixa de saída de desenvolvimento** (`/dev/emails`): só no desenvolvimento local sem SMTP, lista os e-mails gravados em `.data/outbox/`. Em produção responde 404.
- **Página do professor** (`/p/[slug]`): login com nome, apresentação e cor do professor. É o endereço que o professor divulga aos alunos.
- **Convite** (`/convite/[token]`): o aluno cria a senha e aceita os termos. Se for menor de 18 anos (pela data de nascimento cadastrada), precisa marcar a autorização do responsável.
- **Termos de uso e política de privacidade**: textos iniciais em linha com a LGPD, que precisam de revisão jurídica.

### 3.2 Professor

**Disciplinas:** questões, leituras, atividades e turmas pertencem a uma disciplina, e o nível do aluno é registrado por disciplina. Quando o professor tem **duas ou mais** disciplinas, aparecem a escolha da disciplina ao criar conteúdo e as abas de filtro nas listas e nos relatórios. Com uma disciplina só, as telas ficam como antes. Ainda não há tela para criar uma disciplina nova.

**Início:** lista de primeiros passos (cadastrar aluno, criar questão, montar atividade, enviar) enquanto houver passos pendentes. Mostra o resumo (alunos ativos, respostas para corrigir, aulas nos próximos 7 dias, atividades atrasadas), as próximas 5 aulas, as próximas 5 respostas a corrigir e os "alunos que precisam de atenção" (com atividade atrasada ou média abaixo de 60%).

**Alunos**
- Lista com busca por nome ou e-mail, filtro ativos/arquivados, nível, média, pendências e o aviso "sem acesso" para quem ainda não ativou a conta.
- Cadastro e edição: nome, e-mail, nível em cada disciplina (A1–C2 no inglês), telefone, nascimento, responsável, objetivo, CPF (validado), endereço completo e anotações privadas. CPF e endereço são opcionais.
- Ficha do aluno:
  - geração do link de acesso, com os botões copiar, "Enviar pelo WhatsApp" (mensagem pronta para o telefone do aluno) e "Enviar por e-mail"; gerar um link novo invalida os anteriores e também serve para o aluno criar uma senha nova;
  - métricas (média, feitas, pendentes, atrasadas), gráfico de evolução das notas e desempenho por habilidade;
  - lista de atividades com status, nota e acesso às respostas;
  - aulas, dados pessoais e anotações privadas;
  - aviso quando o aluno pediu a exclusão dos dados.
- Ações: exportar os dados (JSON), arquivar ou reativar, excluir definitivamente (apaga conta, entregas, arquivos enviados, aulas individuais e convites, e tira o aluno das turmas e dos envios).

**Turmas**
- Disciplina, nome, nível (ou misto), descrição e seleção de alunos com filtro. A partir da turma dá para passar atividade ou agendar aula.
- Abas "Ativas" e "Arquivadas". **Arquivar** tira a turma das listas e dos seletores (envio de atividade, agendamento de aula), mas mantém as aulas, a presença e os relatórios; os relatórios ganham o grupo "Turmas arquivadas" no filtro. Uma turma arquivada pode ser restaurada.
- **Excluir definitivamente** só aparece quando a turma não tem nenhuma aula realizada. A exclusão apaga as aulas agendadas, avisa os alunos ("aula cancelada") e não apaga os alunos. Com aula realizada, o sistema pede para arquivar.

**Banco de questões**
- Lista com filtros por tipo, habilidade, nível, etiqueta e situação (publicada, rascunho, arquivada), além de busca no enunciado e nas etiquetas. A filtragem é feita no banco e a lista mostra as 200 questões alteradas mais recentemente que atendem aos filtros (com aviso quando há mais).
- Editor único para os 9 tipos (detalhes na seção 4):
  - campos comuns: enunciado, instrução extra, imagem ou áudio (por link ou pelo botão "Enviar arquivo": imagem até 5 MB, áudio até 20 MB), habilidade (leitura, gramática, vocabulário, escrita, compreensão auditiva), nível, pontos, texto de leitura vinculado, etiquetas e explicação;
  - botão "Ver como aluno", com pré-visualização interativa;
  - "Salvar e publicar" ou "Salvar como rascunho";
  - o tipo não muda depois que a questão é criada.
- Ações: duplicar (a cópia vira rascunho), arquivar ou restaurar. Ao editar uma questão já usada em atividades, o sistema avisa que a mudança só vale para os próximos envios.

**Leituras e áudios:** texto-base (leitura) ou áudio (compreensão auditiva, por link ou enviando o arquivo), com título, nível, fonte e transcrição opcional. A página do texto lista as questões dele e tem o botão "Adicionar questão", que já vincula a questão ao texto. Excluir o texto mantém as questões no banco, sem o vínculo.

**Atividades**
- Montagem: disciplina (definida na criação), título, instruções, questões escolhidas do banco (só as publicadas e da mesma disciplina), com busca, filtros e o botão "Adicionar leitura", que inclui todas as questões de um texto. Para cada questão: pontos e ordem.
- Configurações:

| Opção | Valores |
| --- | --- |
| Tempo limite | 0 (sem limite) a 600 min |
| Tentativas | 1 a 10 |
| Embaralhar | Questões e alternativas |
| Mostrar gabarito | Logo após a entrega · Depois do prazo · Nunca |

- Envio: para alunos e/ou turmas ativas, com data de liberação (vazia = agora) e prazo opcional. Cada envio guarda uma cópia congelada das questões, e as imagens e áudios enviados pelo professor ficam ligados ao envio (é isso que libera a mídia para os alunos dele).
- Acompanhamento por envio: quem entregou, status, nota, entrega atrasada, link para corrigir ou ver, botão "WhatsApp" para cada aluno com a atividade pendente (mensagem com o link da atividade e o prazo), alterar o prazo, cancelar o envio (apaga as entregas daquele envio).
- Arquivar ou restaurar a atividade.

**Correção**
- Fila de entregas com resposta aberta pendente (da mais antiga para a mais nova) e as últimas 20 já corrigidas.
- Tela de correção: cada questão mostra a resposta do aluno (na entrega de arquivo, a lista de arquivos com link para baixar), a marcação de certo e errado por item, o gabarito e a explicação. A nota da resposta aberta e da entrega de arquivo é obrigatória; a nota automática pode ser alterada (fica marcada como manual). Há comentário por questão e comentário geral, e os botões "Salvar" e "Salvar e ir para a próxima".

**Agenda**
- Agendar aula para um aluno ou uma turma: data e hora, duração, tema, link da videochamada e repetição semanal (até 52 aulas).
- Lista de próximas e anteriores, agrupada por dia.
- Na aula: editar dados, situação (agendada, realizada, cancelada), o que foi visto, vocabulário e presença por aluno. Excluir uma aula ou "esta e as próximas" da série.

**Relatórios:** filtro por turma e por disciplina, média geral, desempenho por habilidade, tabela de alunos (menor média primeiro; feitas, pendentes, atrasadas) e as 10 questões com menor porcentagem de acerto.

**Notificações:** lista com marcação de não lidas e o botão "Marcar todas como lidas".

**Configurações:** nome exibido, endereço da página (slug único; alguns nomes são reservados), apresentação, cor da marca (6 cores prontas ou qualquer uma pelo seletor) e troca de senha (que encerra as outras sessões abertas).

**Carregamento:** enquanto uma página do professor ou do aluno carrega, o menu aparece na hora e o conteúdo mostra um esqueleto (`loading.tsx`).

### 3.3 Aluno

- **Início:** próxima aula com o botão "Entrar na aula", resumo (média, feitas, pendentes) e até 5 atividades para fazer.
- **Atividades:** "em aberto" e "entregues", com nota ou status.
- **Detalhe da atividade:** instruções, número de questões, pontos, tempo e prazo. Os botões mudam conforme o caso: "Começar", "Continuar" ou "Fazer de novo (N restantes)". Avisa que o cronômetro começa ao clicar e que, depois do prazo, a entrega fica marcada como atrasada. Lista as entregas anteriores.
- **Fazer a atividade:**
  - todas as questões numa página só, com o texto de leitura fixo ao lado das questões dele (no celular, ele fica acima);
  - barra de progresso, contador de respondidas e cronômetro, com entrega automática quando o tempo acaba;
  - rascunho salvo sozinho 1,5 s depois de cada mudança, aviso ao sair com alteração não salva e confirmação antes de entregar, avisando se faltou responder alguma questão;
  - na entrega de arquivo, o botão "Anexar arquivo" envia fotos, PDFs ou áudios (conforme a questão) e mostra a lista, com a opção de retirar enquanto a tentativa está aberta. Fotos são reduzidas no próprio celular antes do envio (lado maior até 1600 px).
- **Resultado:** nota em porcentagem e pontos, ou "entrega recebida, aguardando correção" com os pontos parciais. Na entrega de arquivo, a lista dos arquivos enviados. Mostra o comentário geral e os comentários por questão. O gabarito e a explicação aparecem só quando a regra permite; quando não, a tela explica quando eles vão aparecer.
- **Aulas:** próximas (com o link) e anteriores (com o que foi visto, o vocabulário e as faltas).
- **Progresso:** média, atividades feitas, pendentes e atrasadas, evolução das notas e desempenho por habilidade.
- **Perfil:** dados (só leitura, menos o telefone), troca de senha, "Baixar meus dados" (JSON, inclusive a lista dos arquivos enviados) e "Pedir exclusão dos meus dados" (avisa o professor).
- **Notificações.**

### 3.4 Administrador

Mostra os totais (professores, bloqueados, alunos ativos, atividades enviadas). A tabela de professores traz nome, e-mail, página, número de alunos, número de questões, "E-mail verificado" e data de criação, com os botões "Enviar link de redefinição" (manda ao professor um e-mail para ele mesmo criar a senha nova) e "Bloquear" ou "Desbloquear". O subtítulo mostra com qual papel o app está conectado ao banco; se for um papel com privilégios de dono, aparece um aviso para configurar `DATABASE_APP_URL`.

## 4. Tipos de questão

| Tipo | O professor cadastra | O aluno responde | Correção |
| --- | --- | --- | --- |
| Múltipla escolha, uma resposta | 2 a 6 alternativas e marca a correta | Escolhe uma | Automática: tudo ou nada |
| Múltipla escolha, várias respostas | 2 a 8 alternativas, marca as corretas e escolhe se a nota é parcial | Marca várias; o sistema diz quantas são | Automática. Parcial: (acertos − erros) ÷ corretas, mínimo 0. Sem parcial: só conjunto exato |
| Verdadeiro ou falso | Até 12 afirmações, cada uma com V ou F | Botões V/F por afirmação | Automática, proporcional às afirmações certas |
| Completar lacunas (digitando) | Texto com `[[resposta]]`; variações aceitas com `[[don't\|do not]]`; opção de diferenciar maiúsculas | Digita em cada lacuna, dentro do texto | Automática por lacuna; ignora espaços extras, apóstrofo curvo e pontuação final |
| Completar lacunas (escolhendo) | Mesmo formato, mais palavras extras (distratores) | Escolhe numa lista em cada lacuna; vê o banco de palavras | Automática por lacuna |
| Associação | Até 12 pares (coluna A → coluna B) e itens extras na coluna B | Escolhe o par de cada item | Automática por par |
| Ordenar | Itens na ordem correta (palavras de uma frase ou frases de um texto) | Move com setas para cima e para baixo | Automática: tudo ou nada. Nunca é mostrado já na ordem certa |
| Resposta aberta | Mínimo e máximo de palavras, critérios (o aluno vê) e resposta-modelo | Escreve o texto, com contador de palavras | Manual pelo professor; resposta em branco vale 0 automaticamente |
| Entrega de arquivo | Quantos arquivos (1 a 5), tamanho máximo de cada um (até 20 MB), tipos aceitos (foto, PDF, áudio) e critérios | Anexa os arquivos | Manual pelo professor; sem arquivo vale 0 automaticamente. O servidor só aceita arquivos do próprio aluno, daquela tentativa e daquela questão |

Também há o **texto de leitura ou áudio**: um grupo que junta um texto (ou áudio) e várias questões de qualquer tipo. Ao embaralhar, as questões de um mesmo texto continuam juntas.

**Como uma questão é guardada:** cada questão tem três partes.
- `source`: o que o professor preencheu no editor (privado).
- `content`: o que o aluno vê.
- `answerKey`: o gabarito (privado).

O `content` é gerado a partir do `source` no servidor (`lib/question-types.ts`). As identificações das alternativas são aleatórias, para não revelar a resposta.

**Tipos por disciplina:** cada tipo declara em quais disciplinas pode ser usado (`TYPE_SUBJECTS` em `lib/question-types.ts`). Hoje os 9 tipos valem para qualquer disciplina. O editor só oferece os tipos permitidos, e o servidor recusa um tipo fora da disciplina.

## 5. Regras de negócio

- **Nota da atividade:** a melhor tentativa corrigida. Se nenhuma foi corrigida ainda, vale a última entregue.
- **Status para o aluno:** não iniciada, em andamento, aguardando correção, corrigida ou atrasada (prazo vencido sem entrega).
- **Entrega após o prazo:** é aceita, mas marcada como atrasada (enquanto houver tentativas).
- **Tempo limite:** conta a partir do clique em "Começar" e é conferido no servidor, com 60 s de tolerância. Passado o tempo, vale o último rascunho salvo dentro do prazo.
- **Gabarito:**
  - "Logo após a entrega": aparece quando o aluno usa todas as tentativas ou quando o prazo vence;
  - "Depois do prazo": aparece no fim do prazo (ou, sem prazo, quando acabam as tentativas);
  - "Nunca": não aparece.
- **Cópia congelada:** editar uma questão ou atividade depois do envio não muda o que os alunos já receberam.
- **Embaralhar:** a ordem é sorteada por tentativa, de forma fixa (a mesma tentativa sempre mostra a mesma ordem).
- **Arquivar ou excluir:** alunos, turmas, questões e atividades são arquivados, o que preserva o histórico. A exclusão definitiva existe para alunos (atende à LGPD), para envios cancelados e para turmas sem nenhuma aula realizada (o banco recusa apagar uma turma que ainda tenha aulas).
- **Convites:** valem 7 dias e só uma vez. Gerar um novo invalida os anteriores. O link serve tanto para o primeiro acesso quanto para criar uma senha nova (e, nesse caso, encerra as sessões antigas do aluno).
- **Senha e sessões:** trocar ou redefinir a senha incrementa a "versão da sessão" da conta, e as sessões criadas antes deixam de valer. Os links de e-mail (redefinição: 1 hora; confirmação: 24 horas) são de uso único; no banco fica só o hash deles.
- **E-mails:** o envio acontece depois da resposta da tela, para o tempo de resposta não revelar se um e-mail tem conta. Sem SMTP configurado na Vercel, nada é enviado e as telas avisam.
- **Arquivos:** o tipo e o tamanho são conferidos duas vezes no servidor (no pedido e, depois do envio, com o tamanho e o tipo reais no armazenamento). Uploads nunca confirmados são apagados depois de 24 horas. Uma mídia do professor ligada a algum envio não pode ser apagada. Qualquer pedido de arquivo sem permissão (outro aluno, outro professor, sem login) recebe 404.
- **Notificações geradas:**

| Evento | Quem recebe |
| --- | --- |
| Nova atividade enviada | Aluno |
| Aula agendada | Aluno ou alunos da turma |
| Aula cancelada (inclusive quando a turma é excluída) | Aluno ou alunos da turma |
| Aluno ativou a conta | Professor |
| Aluno entregou uma atividade | Professor |
| Atividade corrigida | Aluno |
| Aluno pediu exclusão dos dados | Professor |

- **Disciplina:** a questão, o texto de leitura e a atividade precisam ser da mesma disciplina (o banco impede o contrário). A disciplina de uma atividade não muda depois de criada.
- **Fuso horário:** datas guardadas em UTC e exibidas no horário de Brasília (fixo, −03:00).

## 6. Dados

PostgreSQL no Neon, com o schema em SQL explícito em `db/migrations/`:

| Migração | O que faz |
| --- | --- |
| `0001_init.sql` | Schema inicial, RLS e o papel `app_user` (Fase 1) |
| `0002_classes_archive.sql` | `classes.archived_at`; aulas passam a impedir a exclusão da turma (`ON DELETE RESTRICT`) |
| `0003_auth_email.sql` | `users.email_verified_at` e `users.session_version`; tabelas `auth_tokens` e `rate_limits` |
| `0004_files.sql` | Tabelas `files` e `assignment_files`, com RLS |

O diagrama de entidades está em [DIAGRAMA.md](DIAGRAMA.md#7-tabelas-e-relações).

| Tabela | O que guarda | Pontos importantes |
| --- | --- | --- |
| `users` | Conta de login de qualquer pessoa | e-mail único, senha (hash), papel, bloqueado, e-mail confirmado em, versão da sessão. Não sabe a que professor pertence |
| `teachers` | Professor | ligado a `users`; endereço público (`slug`) único |
| `subjects` | Disciplina do professor | criada a partir de um modelo (`template_key`); nome único por professor |
| `subject_skills`, `subject_levels` | Habilidades e níveis de cada disciplina | chave natural (`key`, `code`) para o SQL ficar legível |
| `students` | Cadastro do aluno, feito pelo professor | ligado a `users` quando o aluno ativa a conta; índice único em `user_id` (regra atual: uma conta, um professor) |
| `student_levels` | Nível do aluno em cada disciplina | o nível precisa existir na disciplina |
| `invitations` | Links de convite | token, validade e uso |
| `classes`, `class_members` | Turmas e seus alunos | cada turma tem uma disciplina; `archived_at` quando arquivada |
| `passages` | Textos de leitura e áudios | de uma disciplina |
| `questions` | Banco de questões | `source`, `content` e `answer_key` em JSONB; o texto vinculado precisa ser do mesmo professor e da mesma disciplina |
| `activities`, `activity_items` | Atividades e suas questões, em ordem | questão e atividade da mesma disciplina |
| `assignments`, `assignment_students` | Envios e para quem | `snapshot` em JSONB: a cópia congelada das questões e dos textos |
| `submissions` | Tentativas | `responses` e `answers` em JSONB; no máximo uma tentativa aberta por aluno e envio; só quem recebeu o envio pode ter tentativa |
| `lessons`, `lesson_attendance` | Aulas e presença | aula de um aluno **ou** de uma turma |
| `files` | Metadados dos arquivos enviados (o conteúdo fica no armazenamento) | `teacher_id` e RLS forçada; mídia do professor ou entrega do aluno (`student_id`, `submission_id`, `question_id`); chave do objeto sem o nome original; `pending` até a confirmação |
| `assignment_files` | Mídias do professor usadas em cada envio | preenchida ao criar o envio; libera a mídia para os alunos do envio e impede apagá-la (`RESTRICT`) |
| `notifications` | Avisos de cada usuário | |
| `auth_tokens` | Links de redefinição de senha e de confirmação de e-mail | só o SHA-256 do token; validade e uso único; global (procurado pelo hash, antes do login) |
| `rate_limits` | Limites por janela: login por e-mail, pedidos de redefinição por e-mail e por IP, reenvio de confirmação | uma linha por chave |
| `app_meta` | Segredo da sessão e marca de seed | |
| `login_attempts` | Não é mais usada (o limite de login foi para `rate_limits`) | pode ser removida numa migração futura |

**Regras garantidas pelo banco:**
- Toda tabela de dados do professor tem `teacher_id`, e as chaves estrangeiras entre elas incluem `teacher_id`. Assim, uma linha de um professor não consegue apontar para a de outro.
- Exclusões em cascata: apagar um aluno apaga as tentativas, os metadados dos arquivos, a participação em envios e turmas, as aulas individuais, os convites e os níveis dele (os objetos no armazenamento são apagados pelo app logo depois que a transação confirma; se isso falhar, as chaves vão para o log para limpeza manual). Cancelar um envio apaga as tentativas dele. Uma turma com aulas não pode ser apagada (`RESTRICT`).
- Restrições com `CHECK` para situações, papéis e intervalos (por exemplo, tentativas de 1 a 10).

**Dados de demonstração:** na primeira vez em que o banco é acessado (ou com `npm run db:seed`), o sistema cria o administrador e, se `SEED_DEMO` não for `false`, os dados de demonstração: 2 professores, 6 alunos, 13 questões, 2 atividades, entregas e aulas. A professora Sarah tem duas disciplinas (Inglês e Inglês para negócios) para testar a interface com várias disciplinas.

## 7. Arquitetura técnica

- **Stack:** Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, Zod (validação), lucide-react (ícones), PostgreSQL (Neon) com `pg` (node-postgres), sem ORM. E-mail com `nodemailer` (SMTP); arquivos no Vercel Blob privado (`@vercel/blob`).
- **Pastas:**

```text
app/(publico)/   público: entrar, cadastro, convite, recuperar/redefinir senha, verificar e-mail, /p/[slug], termos
app/professor/   área do professor          app/aluno/   área do aluno
app/admin/       administração              app/sair/    encerra a sessão
app/arquivos/    download de arquivos       app/api/uploads/local/  upload do modo local
app/dev/emails/  caixa de saída (só desenvolvimento local)
components/      interface; questions/ = editor, player e revisão de questões
lib/             tipos, tipos de questão, regras de arquivos, WhatsApp, modelos de disciplina, formatação
server/auth/     senha, sessão, tokens dos links, guardas de acesso
server/actions/  Server Actions (todas as alterações)
server/db/       client.ts (conexão e transações), context-sql.ts (início da transação), repo.ts (SQL), seed.ts
server/mail/     envio de e-mail (SMTP ou caixa de saída) e modelos
server/storage/  armazenamento de arquivos (Vercel Blob ou pasta local)
server/services/ envios e correção, transações de várias tabelas, e-mail, arquivos, progresso, exportação
db/migrations/   migrações SQL
scripts/         migrate.mjs, seed.mts, backup.mjs, app-login.mjs
tests/           corretores, verificação de acesso ao banco, testes de banco (tests/db)
```

- **Acesso ao banco:**
  - Todo acesso passa por `withScope(escopo, fn)` em `server/db/repo.ts`. Ele abre uma transação e, **numa única ida ao banco**, assume o papel `app_user` e define o contexto da RLS: `BEGIN; SELECT set_config('role', 'app_user', true), set_config('app.teacher_id', …, true), …`. O `true` faz tudo valer só dentro da transação, o que funciona com o pooler do Neon.
  - Esse comando vai como texto (sem parâmetros) para economizar idas ao banco. Por isso cada valor passa por `contextLiteral()` (`server/db/context-sql.ts`), que aceita só uuid, a constante `on` ou um identificador simples e recusa qualquer outra coisa **antes de conectar**.
  - O escopo é o professor (`teacherId`), o aluno (`{ teacherId, studentId }`), o modo `system` ou nenhum (só tabelas globais).
  - Cada tela faz uma transação só, com consultas específicas: listas sem a cópia congelada nem as respostas (só contagens e pontos), consultas por aluno, contagens no banco e busca de questões filtrada no banco. As consultas de uma transação rodam em sequência (a mesma conexão não aceita consultas em paralelo).
  - O app conecta com `DATABASE_APP_URL` (papel `app_login`, sem privilégios de dono) quando ela existe; senão, com `DATABASE_URL` (o dono), e avisa no log e no painel do administrador. `app_login` é `NOINHERIT`, não é dono de nada e não tem BYPASSRLS: sozinho não lê nenhuma tabela, e um `RESET ROLE` dentro da transação volta para ele, não para o dono.
  - Nenhuma consulta espera para sempre: o pool tem `query_timeout` de 20 s.
  - Um teste automático (`tests/db-access.test.mts`) falha se algum código fora de `server/db/` usar o `pg` ou o pool diretamente, ou trocar o papel do banco.
  - Na Vercel, o pool usa `attachDatabasePool` de `@vercel/functions` e fecha conexões ociosas em 5 s.
  - Tipos: `numeric` volta como `number`, `date` como texto `AAAA-MM-DD` e `timestamptz` como texto ISO.
- **Row Level Security:**
  - Está ativa e forçada nas 18 tabelas com `teacher_id` (as 16 da Fase 1, mais `files` e `assignment_files`). Sem contexto, nenhuma linha aparece.
  - O professor vê e altera só as próprias linhas.
  - O aluno não vê o banco de questões, os textos nem as atividades (inclusive o gabarito); vê só o próprio cadastro, as tentativas dele, os envios atribuídos a ele, as aulas dele ou da turma dele, os arquivos que ele mesmo enviou e as mídias do professor que estão num envio dele já liberado.
  - O papel `app_user` não tem BYPASSRLS. O dono das tabelas (`neondb_owner`) tem, e por isso o app nunca consulta como dono.
- **Quem roda com mais privilégio:**

| Operação | Como roda | Por quê |
| --- | --- | --- |
| Migrações (`npm run db:migrate`) | Como dono (`neondb_owner`), conexão direta | Criam tabelas, políticas e o papel `app_user` |
| Criação do papel `app_login` (`npm run db:app-login`) | Como dono, conexão direta | Cria o papel com login e o liga a `app_user` |
| Backup (`npm run db:backup`) | Como dono, via `pg_dump` | Precisa ler todas as tabelas |
| Conexão de verificação dos testes | Como dono | Confere o resultado de fora da RLS |
| Seed de demonstração | `app_user` em modo `system` | Grava dados de vários professores numa transação |
| Contagens do painel do administrador | `app_user` em modo `system` | Agrega números de todos os professores, sem trazer dados de alunos |
| Achar o aluno a partir da conta de login | `app_user` em modo `system`, só por `user_id` | A conta não sabe a que professor pertence |

  O modo `system` **não** ignora a RLS: ele é uma política (`app_is_system()`) que libera as linhas e só é usada nesses três pontos do código.
- **Transações:** envio de atividade, entrega, correção, exclusão de aluno, cancelamento de envio, cadastro de professor (conta + professor + disciplina), aceite de convite e agendamento de aulas em série rodam cada um numa transação. Entrega e correção travam a tentativa (`SELECT … FOR UPDATE`), então duas entregas simultâneas não corrigem duas vezes.
- **Segurança:**
  - senhas com scrypt e sal aleatório;
  - sessão em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção, assinada com HMAC-SHA256, válida por 14 dias, com a versão da conta (cai quando a senha muda). O segredo vem de `SESSION_SECRET` ou é gerado e guardado no banco (e lido uma vez por instância);
  - links de e-mail com 32 bytes aleatórios, uso único, só o hash no banco; páginas com token no endereço não enviam `Referer`;
  - limites por IP usam só os cabeçalhos definidos pela Vercel (`x-vercel-forwarded-for`, depois `x-real-ip`), nunca o primeiro valor de `x-forwarded-for`, que o cliente pode forjar;
  - arquivos: o navegador envia direto ao armazenamento com uma autorização que vale só para aquela chave, aquele tipo e aquele tamanho máximo, por 10 minutos. Com o store ligado por OIDC, essa autorização é assinada pelo servidor e trocada na rota `/api/uploads/blob` por uma URL pré-assinada do Blob (`handleUploadPresigned`); com `BLOB_READ_WRITE_TOKEN`, por um token de cliente; o download passa sempre por `/arquivos/[id]`, que consulta a tabela no escopo de quem pede e redireciona para uma URL assinada de 5 minutos (no modo local, o próprio app serve o arquivo com `Content-Security-Policy: sandbox`); SVG e HTML não são aceitos;
  - `proxy.ts` barra quem não tem sessão. Cada página e cada Server Action conferem de novo usuário, papel e dono do dado;
  - o gabarito nunca vai para o navegador do aluno antes da hora (verificado no HTML entregue);
  - os dados enviados são validados com Zod e com limites de tamanho.
- **LGPD:** CPF e endereço são opcionais, os termos precisam ser aceitos, menores de idade precisam de autorização do responsável, o aluno exporta os dados e pede exclusão, o professor exporta e exclui. A exportação inclui os arquivos enviados (nome, tipo, tamanho, data e endereço para baixar) e só inclui o gabarito quando a regra da atividade permite. Excluir o aluno apaga também os arquivos dele do armazenamento. A chave dos objetos não usa o nome original do arquivo. O administrador não vê dados de alunos.
- **Modos sem conta configurada:** sem SMTP, o e-mail vai para `.data/outbox/` no desenvolvimento local e, na Vercel, só para um aviso no log (sem o corpo, que tem o link). Sem Vercel Blob configurado (nem `BLOB_STORE_ID` com OIDC, nem `BLOB_READ_WRITE_TOKEN`), os arquivos vão para `.data/uploads/` no desenvolvimento local e, na Vercel, o envio de arquivos fica desativado com aviso. As duas pastas ficam fora do Git (`/.data/`).
- **Interface:** responsiva. No celular, o professor tem menu horizontal e o aluno tem menu inferior. A cor da marca de cada professor é aplicada nas áreas dele e dos alunos.

## 8. Configuração e publicação

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão pelo pooler do Neon, como dono (o app usa se não houver `DATABASE_APP_URL`) |
| `DATABASE_URL_UNPOOLED` | Conexão direta como dono: migrações, seed, testes e backup |
| `DATABASE_APP_URL` | Recomendado: conexão do app com o papel `app_login`, pelo pooler. Criada por `npm run db:app-login` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envio de e-mail (por exemplo, Gmail com senha de app: `smtp.gmail.com`, porta 465) |
| `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY` | Envio de arquivos (Vercel Blob privado) com autenticação OIDC, o padrão da Vercel: ela cria as duas ao ligar o store ao projeto, e o token OIDC de curta duração chega em cada requisição (exige "System Environment Variables" habilitado) |
| `BLOB_READ_WRITE_TOKEN` | Alternativa ao OIDC: token fixo do store. Se existir, tem preferência |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Conta de administrador, criada no primeiro acesso |
| `SEED_DEMO=false` | Começar sem dados de demonstração (recomendado com usuários reais, porque as senhas de demonstração estão no repositório público) |
| `SESSION_SECRET` | Opcional |
| `APP_URL` | Endereço usado nos links de convite e nos e-mails (recomendado em produção) |
| `BACKUP_DIR` | Opcional: pasta dos backups, fora do repositório |

As variáveis `POSTGRES_*`, `PG*` e `NEON_AUTH_*` que a integração Neon-Vercel cria não são usadas.

| Comando | O que faz |
| --- | --- |
| `npm run dev` · `npm run build` | Desenvolvimento e build |
| `npm run db:migrate` | Aplica as migrações pendentes. Com `--env-file=<arquivo> --confirmar`, roda em outro banco (produção) |
| `npm run db:seed` | Grava o administrador e os dados de demonstração |
| `npm run db:reset` | Apaga e recria o banco (só com `.env.local`) |
| `npm run db:backup` | `pg_dump` com data no nome do arquivo, numa pasta fora do repositório |
| `npm run db:app-login` | Cria o papel `app_login` e grava `DATABASE_APP_URL` no arquivo de ambiente, sem mostrar a senha. Com `--env-file=<arquivo> --confirmar`, em outro banco; `--rotate` troca a senha |
| `npm test` | Todos os testes |

**Como está publicado:**

| Ambiente | Endereço | Banco (Neon) | Variáveis do banco |
| --- | --- | --- | --- |
| Produção | https://app-docentia.vercel.app (o antigo teacher-sarah.vercel.app redireciona para ele) | branch **main** | criadas pela integração Neon-Vercel, que está ligada **só** ao ambiente Production |
| Preview (pull requests) | endereço gerado pela Vercel para cada deploy | branch **dev** | `DATABASE_URL` e `DATABASE_URL_UNPOOLED` criadas à mão só para Preview, com `sslmode=verify-full` |
| Desenvolvimento local | http://localhost:3000 | branch **dev** | `.env.local` |

- **Região:** as funções da Vercel rodam em São Paulo (**gru1**), a mesma região do banco no Neon (`sa-east-1`). Funções em outra região (antes era Washington, `iad1`) deixam cada consulta bem mais lenta.
- **Variáveis de Produção:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SEED_DEMO=false` (as contas de demonstração não existem em produção). Recomendado: `APP_URL=https://app-docentia.vercel.app`, para os links de convite sempre usarem o domínio de produção.
- **Migrações em produção:** antes de juntar código com migração nova na `main`, rode `npm run db:migrate -- --env-file=<arquivo temporário com as URLs da main> --confirmar` e apague o arquivo depois. As migrações 0002 a 0004 são compatíveis com o código anterior (só acrescentam), então podem ser aplicadas antes do merge.
- **Passo a passo da Fase 2 em produção** (contas, variáveis, migrações e papel com login): seção "PRÓXIMOS PASSOS PARA O DESENVOLVEDOR" do [RELATORIO-FASE2.md](RELATORIO-FASE2.md).

## 9. Qualidade e testes

- `npm test` roda dois grupos (83 testes no total):
  - **19 testes sem banco:**
    - 12 dos corretores (pontuação parcial, variações de lacuna, maiúsculas, ordem nunca correta de início, validação do editor, entrega de arquivo);
    - 4 de acesso ao banco: nenhuma consulta fora do `withScope`, o formato do início da transação e um valor malicioso (uuid com aspas e ponto e vírgula) recusado antes de chegar ao banco;
    - 3 do WhatsApp (telefone e montagem do link e das mensagens).
  - **64 testes de banco** na branch dev, num schema temporário apagado no fim (os que sobram de execuções interrompidas são apagados no início):
    - isolamento por RLS, com SQL cru e sem filtro de `teacher_id`, chaves estrangeiras entre professores e o que o aluno enxerga;
    - tipos `numeric` e `date`, transações desfeitas por inteiro, entregas simultâneas, exclusão de aluno e cancelamento de envio;
    - turmas: arquivar e restaurar, turma arquivada fora dos destinos, exclusão bloqueada com aula realizada, exclusão que cancela as aulas e avisa, `RESTRICT` por SQL;
    - consultas leves: sem a cópia congelada nem as respostas, por aluno, fila de correção e busca de questões, sem vazar entre professores;
    - e-mail: token expirado, reutilizado, inexistente e alterado; resposta igual para e-mail inexistente; limites por e-mail, por IP e de login; versão da sessão; confirmação de e-mail; link do admin; caixa de saída; cabeçalhos de IP;
    - arquivos: download (outro aluno, outro professor e sem login recebem 404), isolamento da tabela `files` por SQL cru, tipo e tamanho, limite por questão, mídia antes da liberação, `RESTRICT`, exclusão do aluno apagando os objetos; escolha do modo de armazenamento (token fixo, OIDC, local, desligado) e a autorização da URL pré-assinada recusada para outra chave, alterada ou vencida;
    - papel `app_login`, pelo pooler e pela conexão direta: não lê tabelas, `RESET ROLE` não volta para o dono, não desliga a RLS e o app inteiro funciona com ele.
- A checagem de tipos e o build de produção passam.
- Testado manualmente no navegador, com o banco da branch dev:
  - login dos três perfis;
  - interface com duas disciplinas (abas, escolha da disciplina no editor e no montador de atividades) e com uma só (sem mudança);
  - criação de questão;
  - leitura com cronômetro e rascunho que volta depois de recarregar;
  - entrega com o gabarito escondido até o prazo;
  - exportação do aluno respeitando o gabarito;
  - cadastro de professor, convite e ativação do aluno, link de uso único;
  - exclusão definitiva de aluno;
  - 404 ao abrir dados de outro professor;
  - painel do administrador;
  - layout no celular;
  - (Fase 2) turma arquivada fora dos seletores; recuperação de senha completa pela caixa de saída, com a sessão antiga derrubada e o link recusado na segunda vez; confirmação de e-mail com reenvio; convite por e-mail e pelo WhatsApp; aluno entregando foto (reduzida de 2400 para 1600 px) e professor vendo na correção; download negado (404) para outra aluna, outro professor e sem login; app inteiro rodando com `app_login`.

## 10. Limitações conhecidas e o que não existe ainda

- **E-mail:** existe para recuperação de senha, confirmação, convites e o link do admin, mas depende da conta SMTP configurada em produção. As notificações (atividade nova, correção etc.) continuam só dentro do app; não há e-mail de aviso.
- **Arquivos:** dependem do store Vercel Blob em produção. Não há antivírus nem conversão de formatos (fotos HEIC do iPhone dependem do navegador converter). Mídias que deixam de ser usadas por questões ou textos não são apagadas sozinhas, e não há tela para o professor ver e apagar suas mídias. Excluir o envio não apaga os arquivos das entregas (eles continuam do aluno e saem quando ele é excluído).
- **Login:** não há login com Google. A confirmação do e-mail do professor não bloqueia nada (é só um aviso).
- **WhatsApp:** é só um link `wa.me` com a mensagem pronta; nada é enviado automaticamente.
- **Interação:** ordenar e associar usam setas e listas de seleção, não arrastar e soltar. Os textos não têm formatação (negrito, listas).
- **Lembretes:** não há tarefas agendadas, então não existe lembrete de prazo nem de aula.
- **Um aluno, um professor:** não existe conta única para quem tem aula com vários professores, nem escolas ou coordenadores.
- **Cobrança:** não há planos, assinatura ou pagamento.
- **Conteúdo compartilhado:** não dá para compartilhar questões entre professores, importar questões (planilha, outro sistema) nem exportar atividades (PDF).
- **Comunicação e engajamento:** não há mensagens entre professor e aluno, mural ou recados, nem conquistas, metas ou sequência de dias.
- **Fuso:** horário de Brasília fixo; não há fuso por professor.
- **Disciplinas:** só existe o modelo de inglês e não há tela para criar ou editar disciplinas, habilidades e níveis.
- **Banco de dados:**
  - as telas mais usadas (início, alunos, ficha, questões, correção, telas do aluno) já fazem uma transação com consultas específicas; telas menos usadas (agenda, relatórios, leituras, lista de atividades) ainda carregam tudo do professor e filtram no código;
  - o papel `app_login` existe na branch dev; em produção, enquanto `DATABASE_APP_URL` não for configurada, o app continua conectando como dono (com o aviso no log e no painel);
  - as tabelas `invitations`, `auth_tokens` e `rate_limits` não têm RLS: são procuradas pelo token ou pela chave antes de qualquer login.
- **Dependências:** o `npm audit` aponta vulnerabilidades em pacotes que já estavam no projeto antes da Fase 2, inclusive no Next.js (versão 16.2.6). A atualização é recomendada numa mudança à parte (ver o relatório da Fase 2).
- **Testes:** não há testes automáticos de ponta a ponta, nem auditoria de acessibilidade completa.

## 11. Contexto para avaliação

O objetivo é que **qualquer professor de inglês** possa usar a plataforma com seus próprios alunos. Os critérios principais são:

1. Facilidade para o professor criar e corrigir exercícios.
2. Experiência simples para o aluno no celular.
3. Isolamento e privacidade dos dados.
4. Custo baixo de hospedagem no início.

Sugestões de funcionalidades devem considerar esse público (professores autônomos, que pagariam do próprio bolso) e o que já existe nas seções 3 a 5.
