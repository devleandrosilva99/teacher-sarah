# Documentação do sistema

Estado em 26/10/2026 · branch `fase1-postgres` (Fase 1: PostgreSQL e disciplinas). Os diagramas das telas, dos fluxos e das tabelas estão em [DIAGRAMA.md](DIAGRAMA.md); o que mudou na Fase 1 está em [RELATORIO-FASE1.md](RELATORIO-FASE1.md).

## 1. O que é

Plataforma web para **professores de inglês** acompanharem seus alunos. Cada professor tem um espaço isolado, com disciplinas, alunos, turmas, banco de questões, atividades, correção, agenda e relatórios, além de uma página própria (`/p/nome-do-professor`) com a cor da sua marca. O aluno entra por convite do professor e vê só o que o professor passou para ele.

Começou como protótipo de uma única professora ("Teacher Sarah") e foi reescrito como sistema para vários professores. O nome definitivo da plataforma ainda não foi escolhido: hoje está em `lib/brand.ts`.

**Estágio atual:** protótipo funcional, pronto para piloto. Todas as telas estão implementadas e os fluxos principais foram testados no navegador. Hospedagem: Vercel. Banco: PostgreSQL no Neon, com o isolamento entre professores garantido pelo próprio banco (Row Level Security).

**Disciplinas:** o sistema já separa o conteúdo por disciplina. Cada professor começa com **Inglês**, criada a partir de um modelo com as habilidades (leitura, gramática, vocabulário, escrita, compreensão auditiva) e os níveis A1–C2. A estrutura está pronta para outras disciplinas e tipos de questão específicos, mas por enquanto só existe o modelo de inglês.

**Público:** professores autônomos de inglês, com aulas particulares ou pequenas turmas, online ou presenciais, e seus alunos, adolescentes e adultos (menores de idade são permitidos com autorização do responsável). Interface em português; o conteúdo das questões fica em inglês.

## 2. Perfis e permissões

| Perfil | Como entra | Pode | Não pode |
| --- | --- | --- | --- |
| Professor | Autocadastro em `/cadastro` (e-mail e senha) | Tudo sobre os próprios alunos, turmas, questões, atividades, correção, agenda e relatórios; personalizar sua página | Ver qualquer dado de outro professor |
| Aluno | Convite do professor: link `/convite/[token]`, uso único, vale 7 dias | Ver e fazer atividades atribuídas a ele; ver notas, aulas e progresso; editar o telefone; trocar a senha; exportar os dados; pedir a exclusão | Ver outros alunos; ver gabarito antes da hora; criar conteúdo; ver as anotações privadas do professor |
| Administrador | Criado pelas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` | Ver professores e contagens; bloquear ou desbloquear professores | Ver dados pessoais e respostas dos alunos |

- A conta de login (tabela `users`) é separada do cadastro do aluno feito pelo professor (tabela `students`). Por enquanto, cada aluno pertence a **um** professor: quem tem aula com dois professores precisa de duas contas, com e-mails diferentes. A separação deixa pronta a unificação de contas no futuro.
- Se um professor é bloqueado, ele e os alunos dele perdem o acesso.
- Um aluno arquivado não consegue entrar, mas o histórico dele é mantido.

## 3. Funcionalidades

### 3.1 Público

- **Página inicial** (`/`): apresentação da plataforma e botões "Criar conta de professor" e "Sou aluno". Quem já está logado vai direto para a sua área.
- **Entrar** (`/entrar`): login único para os três perfis, com limite de 5 tentativas erradas a cada 15 minutos por e-mail. Mensagens específicas para conta arquivada ou bloqueada.
- **Cadastro de professor** (`/cadastro`): nome, e-mail e senha (mínimo de 8 caracteres), com aceite obrigatório dos termos. O endereço público (slug) é gerado a partir do nome.
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
  - geração do link de acesso, com botão de copiar; gerar um link novo invalida os anteriores e também serve para redefinir a senha;
  - métricas (média, feitas, pendentes, atrasadas), gráfico de evolução das notas e desempenho por habilidade;
  - lista de atividades com status, nota e acesso às respostas;
  - aulas, dados pessoais e anotações privadas;
  - aviso quando o aluno pediu a exclusão dos dados.
- Ações: exportar os dados (JSON), arquivar ou reativar, excluir definitivamente (apaga conta, entregas, aulas individuais e convites, e tira o aluno das turmas e dos envios).

**Turmas:** disciplina, nome, nível (ou misto), descrição e seleção de alunos com filtro. A partir da turma dá para passar atividade ou agendar aula. Excluir a turma não apaga os alunos.

**Banco de questões**
- Lista com filtros por tipo, habilidade, nível, etiqueta e situação (publicada, rascunho, arquivada), além de busca no enunciado e nas etiquetas.
- Editor único para os 8 tipos (detalhes na seção 4):
  - campos comuns: enunciado, instrução extra, link de imagem ou áudio, habilidade (leitura, gramática, vocabulário, escrita, compreensão auditiva), nível, pontos, texto de leitura vinculado, etiquetas e explicação;
  - botão "Ver como aluno", com pré-visualização interativa;
  - "Salvar e publicar" ou "Salvar como rascunho";
  - o tipo não muda depois que a questão é criada.
- Ações: duplicar (a cópia vira rascunho), arquivar ou restaurar. Ao editar uma questão já usada em atividades, o sistema avisa que a mudança só vale para os próximos envios.

**Leituras e áudios:** texto-base (leitura) ou áudio por link (compreensão auditiva), com título, nível, fonte e transcrição opcional. A página do texto lista as questões dele e tem o botão "Adicionar questão", que já vincula a questão ao texto. Excluir o texto mantém as questões no banco, sem o vínculo.

**Atividades**
- Montagem: disciplina (definida na criação), título, instruções, questões escolhidas do banco (só as publicadas e da mesma disciplina), com busca, filtros e o botão "Adicionar leitura", que inclui todas as questões de um texto. Para cada questão: pontos e ordem.
- Configurações:

| Opção | Valores |
| --- | --- |
| Tempo limite | 0 (sem limite) a 600 min |
| Tentativas | 1 a 10 |
| Embaralhar | Questões e alternativas |
| Mostrar gabarito | Logo após a entrega · Depois do prazo · Nunca |

- Envio: para alunos e/ou turmas, com data de liberação (vazia = agora) e prazo opcional. Cada envio guarda uma cópia congelada das questões.
- Acompanhamento por envio: quem entregou, status, nota, entrega atrasada, link para corrigir ou ver, alterar o prazo, cancelar o envio (apaga as entregas daquele envio).
- Arquivar ou restaurar a atividade.

**Correção**
- Fila de entregas com resposta aberta pendente (da mais antiga para a mais nova) e as últimas 20 já corrigidas.
- Tela de correção: cada questão mostra a resposta do aluno, a marcação de certo e errado por item, o gabarito e a explicação. A nota da resposta aberta é obrigatória; a nota automática pode ser alterada (fica marcada como manual). Há comentário por questão e comentário geral, e os botões "Salvar" e "Salvar e ir para a próxima".

**Agenda**
- Agendar aula para um aluno ou uma turma: data e hora, duração, tema, link da videochamada e repetição semanal (até 52 aulas).
- Lista de próximas e anteriores, agrupada por dia.
- Na aula: editar dados, situação (agendada, realizada, cancelada), o que foi visto, vocabulário e presença por aluno. Excluir uma aula ou "esta e as próximas" da série.

**Relatórios:** filtro por turma e por disciplina, média geral, desempenho por habilidade, tabela de alunos (menor média primeiro; feitas, pendentes, atrasadas) e as 10 questões com menor porcentagem de acerto.

**Notificações:** lista com marcação de não lidas e o botão "Marcar todas como lidas".

**Configurações:** nome exibido, endereço da página (slug único; alguns nomes são reservados), apresentação, cor da marca (6 cores prontas ou qualquer uma pelo seletor) e troca de senha.

### 3.3 Aluno

- **Início:** próxima aula com o botão "Entrar na aula", resumo (média, feitas, pendentes) e até 5 atividades para fazer.
- **Atividades:** "em aberto" e "entregues", com nota ou status.
- **Detalhe da atividade:** instruções, número de questões, pontos, tempo e prazo. Os botões mudam conforme o caso: "Começar", "Continuar" ou "Fazer de novo (N restantes)". Avisa que o cronômetro começa ao clicar e que, depois do prazo, a entrega fica marcada como atrasada. Lista as entregas anteriores.
- **Fazer a atividade:**
  - todas as questões numa página só, com o texto de leitura fixo ao lado das questões dele (no celular, ele fica acima);
  - barra de progresso, contador de respondidas e cronômetro, com entrega automática quando o tempo acaba;
  - rascunho salvo sozinho 1,5 s depois de cada mudança, aviso ao sair com alteração não salva e confirmação antes de entregar, avisando se faltou responder alguma questão.
- **Resultado:** nota em porcentagem e pontos, ou "entrega recebida, aguardando correção" com os pontos parciais. Mostra o comentário geral e os comentários por questão. O gabarito e a explicação aparecem só quando a regra permite; quando não, a tela explica quando eles vão aparecer.
- **Aulas:** próximas (com o link) e anteriores (com o que foi visto, o vocabulário e as faltas).
- **Progresso:** média, atividades feitas, pendentes e atrasadas, evolução das notas e desempenho por habilidade.
- **Perfil:** dados (só leitura, menos o telefone), troca de senha, "Baixar meus dados" (JSON) e "Pedir exclusão dos meus dados" (avisa o professor).
- **Notificações.**

### 3.4 Administrador

Mostra os totais (professores, bloqueados, alunos ativos, atividades enviadas). A tabela de professores traz nome, e-mail, página, número de alunos, número de questões e data de criação, com o botão "Bloquear" ou "Desbloquear".

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

Também há o **texto de leitura ou áudio**: um grupo que junta um texto (ou áudio) e várias questões de qualquer tipo. Ao embaralhar, as questões de um mesmo texto continuam juntas.

**Como uma questão é guardada:** cada questão tem três partes.
- `source`: o que o professor preencheu no editor (privado).
- `content`: o que o aluno vê.
- `answerKey`: o gabarito (privado).

O `content` é gerado a partir do `source` no servidor (`lib/question-types.ts`). As identificações das alternativas são aleatórias, para não revelar a resposta.

**Tipos por disciplina:** cada tipo declara em quais disciplinas pode ser usado (`TYPE_SUBJECTS` em `lib/question-types.ts`). Hoje os 8 tipos valem para qualquer disciplina. O editor só oferece os tipos permitidos, e o servidor recusa um tipo fora da disciplina.

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
- **Arquivar ou excluir:** alunos, questões e atividades são arquivados, o que preserva o histórico. A exclusão definitiva existe só para alunos (atende à LGPD) e para envios cancelados.
- **Convites:** valem 7 dias e só uma vez. Gerar um novo invalida os anteriores. O link serve tanto para o primeiro acesso quanto para criar uma senha nova.
- **Notificações geradas:**

| Evento | Quem recebe |
| --- | --- |
| Nova atividade enviada | Aluno |
| Aula agendada | Aluno ou alunos da turma |
| Aula cancelada | Aluno ou alunos da turma |
| Aluno ativou a conta | Professor |
| Aluno entregou uma atividade | Professor |
| Atividade corrigida | Aluno |
| Aluno pediu exclusão dos dados | Professor |

- **Disciplina:** a questão, o texto de leitura e a atividade precisam ser da mesma disciplina (o banco impede o contrário). A disciplina de uma atividade não muda depois de criada.
- **Fuso horário:** datas guardadas em UTC e exibidas no horário de Brasília (fixo, −03:00).

## 6. Dados

PostgreSQL no Neon, com o schema em SQL explícito em `db/migrations/0001_init.sql`. O diagrama de entidades está em [DIAGRAMA.md](DIAGRAMA.md#7-tabelas-e-relações).

| Tabela | O que guarda | Pontos importantes |
| --- | --- | --- |
| `users` | Conta de login de qualquer pessoa | e-mail único, senha (hash), papel, bloqueado. Não sabe a que professor pertence |
| `teachers` | Professor | ligado a `users`; endereço público (`slug`) único |
| `subjects` | Disciplina do professor | criada a partir de um modelo (`template_key`); nome único por professor |
| `subject_skills`, `subject_levels` | Habilidades e níveis de cada disciplina | chave natural (`key`, `code`) para o SQL ficar legível |
| `students` | Cadastro do aluno, feito pelo professor | ligado a `users` quando o aluno ativa a conta; índice único em `user_id` (regra atual: uma conta, um professor) |
| `student_levels` | Nível do aluno em cada disciplina | o nível precisa existir na disciplina |
| `invitations` | Links de convite | token, validade e uso |
| `classes`, `class_members` | Turmas e seus alunos | cada turma tem uma disciplina |
| `passages` | Textos de leitura e áudios | de uma disciplina |
| `questions` | Banco de questões | `source`, `content` e `answer_key` em JSONB; o texto vinculado precisa ser do mesmo professor e da mesma disciplina |
| `activities`, `activity_items` | Atividades e suas questões, em ordem | questão e atividade da mesma disciplina |
| `assignments`, `assignment_students` | Envios e para quem | `snapshot` em JSONB: a cópia congelada das questões e dos textos |
| `submissions` | Tentativas | `responses` e `answers` em JSONB; no máximo uma tentativa aberta por aluno e envio; só quem recebeu o envio pode ter tentativa |
| `lessons`, `lesson_attendance` | Aulas e presença | aula de um aluno **ou** de uma turma |
| `notifications` | Avisos de cada usuário | |
| `login_attempts`, `app_meta` | Limite de tentativas de login; segredo da sessão e marca de seed | |

**Regras garantidas pelo banco:**
- Toda tabela de dados do professor tem `teacher_id`, e as chaves estrangeiras entre elas incluem `teacher_id`. Assim, uma linha de um professor não consegue apontar para a de outro.
- Exclusões em cascata: apagar um aluno apaga as tentativas, a participação em envios e turmas, as aulas individuais, os convites e os níveis dele. Cancelar um envio apaga as tentativas dele.
- Restrições com `CHECK` para situações, papéis e intervalos (por exemplo, tentativas de 1 a 10).

**Dados de demonstração:** na primeira vez em que o banco é acessado (ou com `npm run db:seed`), o sistema cria o administrador e, se `SEED_DEMO` não for `false`, os dados de demonstração: 2 professores, 6 alunos, 13 questões, 2 atividades, entregas e aulas. A professora Sarah tem duas disciplinas (Inglês e Inglês para negócios) para testar a interface com várias disciplinas.

## 7. Arquitetura técnica

- **Stack:** Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, Zod (validação), lucide-react (ícones), PostgreSQL (Neon) com `pg` (node-postgres), sem ORM.
- **Pastas:**

```text
app/(publico)/   público: entrar, cadastro, convite, /p/[slug], termos
app/professor/   área do professor          app/aluno/   área do aluno
app/admin/       administração              app/sair/    encerra a sessão
components/      interface; questions/ = editor, player e revisão de questões
lib/             tipos, tipos de questão, modelos de disciplina, formatação
server/auth/     senha, sessão, guardas de acesso
server/actions/  Server Actions (todas as alterações)
server/db/       client.ts (conexão e transações), repo.ts (SQL), seed.ts
server/services/ envios e correção, transações de várias tabelas, progresso, exportação
db/migrations/   migrações SQL
scripts/         migrate.mjs, seed.mts, backup.mjs
tests/           corretores, verificação de acesso ao banco, testes de banco (tests/db)
```

- **Acesso ao banco:**
  - Todo acesso passa por `withScope(escopo, fn)` em `server/db/repo.ts`. Ele abre uma transação, faz `SET LOCAL ROLE app_user` e define o contexto da RLS com `set_config(..., true)`, que vale só dentro da transação e funciona com o pooler do Neon.
  - O escopo é o professor (`teacherId`), o aluno (`{ teacherId, studentId }`), o modo `system` ou nenhum (só tabelas globais).
  - Um teste automático (`tests/db-access.test.mts`) falha se algum código fora de `server/db/client.ts` usar o `pg` ou o pool diretamente, ou trocar o papel do banco.
  - Na Vercel, o pool usa `attachDatabasePool` de `@vercel/functions` e fecha conexões ociosas em 5 s.
  - Tipos: `numeric` volta como `number`, `date` como texto `AAAA-MM-DD` e `timestamptz` como texto ISO.
- **Row Level Security:**
  - Está ativa e forçada nas 16 tabelas com `teacher_id`. Sem contexto, nenhuma linha aparece.
  - O professor vê e altera só as próprias linhas.
  - O aluno não vê o banco de questões, os textos nem as atividades (inclusive o gabarito); vê só o próprio cadastro, as tentativas dele, os envios atribuídos a ele e as aulas dele ou da turma dele.
  - O papel `app_user` não tem BYPASSRLS. O dono das tabelas (`neondb_owner`) tem, e por isso o app nunca consulta como dono.
- **Quem roda com mais privilégio:**

| Operação | Como roda | Por quê |
| --- | --- | --- |
| Migrações (`npm run db:migrate`) | Como dono (`neondb_owner`), conexão direta | Criam tabelas, políticas e o papel `app_user` |
| Backup (`npm run db:backup`) | Como dono, via `pg_dump` | Precisa ler todas as tabelas |
| Conexão de verificação dos testes | Como dono | Confere o resultado de fora da RLS |
| Seed de demonstração | `app_user` em modo `system` | Grava dados de vários professores numa transação |
| Contagens do painel do administrador | `app_user` em modo `system` | Agrega números de todos os professores, sem trazer dados de alunos |
| Achar o aluno a partir da conta de login | `app_user` em modo `system`, só por `user_id` | A conta não sabe a que professor pertence |

  O modo `system` **não** ignora a RLS: ele é uma política (`app_is_system()`) que libera as linhas e só é usada nesses três pontos do código.
- **Transações:** envio de atividade, entrega, correção, exclusão de aluno, cancelamento de envio, cadastro de professor (conta + professor + disciplina), aceite de convite e agendamento de aulas em série rodam cada um numa transação. Entrega e correção travam a tentativa (`SELECT … FOR UPDATE`), então duas entregas simultâneas não corrigem duas vezes.
- **Segurança:**
  - senhas com scrypt e sal aleatório;
  - sessão em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção, assinada com HMAC-SHA256, válida por 14 dias. O segredo vem de `SESSION_SECRET` ou é gerado e guardado no banco;
  - `proxy.ts` barra quem não tem sessão. Cada página e cada Server Action conferem de novo usuário, papel e dono do dado;
  - o gabarito nunca vai para o navegador do aluno antes da hora (verificado no HTML entregue);
  - os dados enviados são validados com Zod e com limites de tamanho.
- **LGPD:** CPF e endereço são opcionais, os termos precisam ser aceitos, menores de idade precisam de autorização do responsável, o aluno exporta os dados e pede exclusão, o professor exporta e exclui. A exportação do aluno só inclui o gabarito quando a regra da atividade permite. O administrador não vê dados de alunos.
- **Interface:** responsiva. No celular, o professor tem menu horizontal e o aluno tem menu inferior. A cor da marca de cada professor é aplicada nas áreas dele e dos alunos.

## 8. Configuração e publicação

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão do app, pelo pooler do Neon |
| `DATABASE_URL_UNPOOLED` | Conexão direta: migrações, seed, testes e backup |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Conta de administrador, criada no primeiro acesso |
| `SEED_DEMO=false` | Começar sem dados de demonstração (recomendado com usuários reais, porque as senhas de demonstração estão no repositório público) |
| `SESSION_SECRET` | Opcional |
| `APP_URL` | Opcional: endereço usado nos links de convite |
| `BACKUP_DIR` | Opcional: pasta dos backups, fora do repositório |

As variáveis `POSTGRES_*`, `PG*` e `NEON_AUTH_*` que a integração Neon-Vercel cria não são usadas.

| Comando | O que faz |
| --- | --- |
| `npm run dev` · `npm run build` | Desenvolvimento e build |
| `npm run db:migrate` | Aplica as migrações pendentes. Com `--env-file=<arquivo> --confirmar`, roda em outro banco (produção) |
| `npm run db:seed` | Grava o administrador e os dados de demonstração |
| `npm run db:reset` | Apaga e recria o banco (só com `.env.local`) |
| `npm run db:backup` | `pg_dump` com data no nome do arquivo, numa pasta fora do repositório |
| `npm test` | Todos os testes |

- **Desenvolvimento local:** o `.env.local` aponta para a branch **dev** do Neon.
- **Produção:** usa a branch **main**.
- **Preview da Vercel:** deve apontar para a branch dev. O passo a passo está no relatório da Fase 1.

## 9. Qualidade e testes

- `npm test` roda três grupos:
  - **11 testes dos corretores** (pontuação parcial, variações de lacuna, maiúsculas, ordem nunca correta de início, validação do editor);
  - **2 verificações de acesso ao banco** (nenhuma consulta fora do `withScope`);
  - **19 testes de banco** na branch dev, num schema temporário apagado no fim (os que sobram de execuções interrompidas são apagados no início):
    - isolamento por RLS, com SQL cru e sem filtro de `teacher_id`;
    - chaves estrangeiras entre professores;
    - o que o aluno enxerga;
    - tipos `numeric` e `date`;
    - transações desfeitas por inteiro quando algo falha no meio;
    - entregas simultâneas;
    - exclusão de aluno e cancelamento de envio.
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
  - layout no celular.

## 10. Limitações conhecidas e o que não existe ainda

- **E-mail:** não há envio. Convites são links que o professor copia, os avisos só aparecem dentro do app e o professor que esquece a senha não tem como recuperá-la (nem o administrador tem uma tela para isso).
- **Arquivos:** imagens e áudios só entram por link; não há upload.
- **Login:** não há login com Google nem verificação do e-mail do professor.
- **Interação:** ordenar e associar usam setas e listas de seleção, não arrastar e soltar. Os textos não têm formatação (negrito, listas).
- **Lembretes:** não há tarefas agendadas, então não existe lembrete de prazo nem de aula.
- **Um aluno, um professor:** não existe conta única para quem tem aula com vários professores, nem escolas ou coordenadores.
- **Cobrança:** não há planos, assinatura ou pagamento.
- **Conteúdo compartilhado:** não dá para compartilhar questões entre professores, importar questões (planilha, outro sistema) nem exportar atividades (PDF).
- **Comunicação e engajamento:** não há mensagens entre professor e aluno, mural ou recados, nem conquistas, metas ou sequência de dias.
- **Fuso:** horário de Brasília fixo; não há fuso por professor.
- **Disciplinas:** só existe o modelo de inglês e não há tela para criar ou editar disciplinas, habilidades e níveis.
- **Banco de dados:**
  - várias telas ainda carregam todas as linhas do professor e filtram no código (herança da versão em Redis). Funciona bem para o volume de um professor, mas consultas específicas por tela seriam mais eficientes;
  - a conexão do app é a do dono das tabelas (`neondb_owner`, com BYPASSRLS); a RLS vale porque toda transação faz `SET LOCAL ROLE app_user`. Um papel com login próprio, sem privilégios de dono, seria mais forte (ver o relatório da Fase 1);
  - a tabela `invitations` não tem RLS: o convite é procurado pelo token antes de qualquer login.
- **Testes:** não há testes automáticos de ponta a ponta, nem auditoria de acessibilidade completa.

## 11. Contexto para avaliação

O objetivo é que **qualquer professor de inglês** possa usar a plataforma com seus próprios alunos. Os critérios principais são:

1. Facilidade para o professor criar e corrigir exercícios.
2. Experiência simples para o aluno no celular.
3. Isolamento e privacidade dos dados.
4. Custo baixo de hospedagem no início.

Sugestões de funcionalidades devem considerar esse público (professores autônomos, que pagariam do próprio bolso) e o que já existe nas seções 3 a 5.
