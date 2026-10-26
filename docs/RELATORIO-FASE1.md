# Relatório da Fase 1: PostgreSQL (Neon) e disciplinas

Branch `fase1-postgres`, criada a partir de `plataforma-multiprofessor`. Estado em 26/10/2026.

A Fase 1 trocou o armazenamento (Redis, arquivo ou memória) por PostgreSQL no Neon, com isolamento entre professores garantido pelo banco (RLS), transações nas operações que alteram várias tabelas, login separado do cadastro do aluno e a entidade Disciplina.

- **Testes:** todos passam (13 sem banco e 19 de banco na branch dev), assim como a checagem de tipos e o build.
- **Branch dev do Neon:** está migrada e com os dados de demonstração.
- **Branch main (produção):** migrada (backup antes, migração `0001_init`, `app_user` conferido). O pull request #1 foi juntado na `main`, e a produção (https://app-docentia.vercel.app) roda a Fase 1. Desde então a plataforma se chama **Docentia**.

## 1. O que foi implementado

### 1.1 Schema

Uma migração em SQL explícito: [db/migrations/0001_init.sql](../db/migrations/0001_init.sql). São 22 tabelas, mais a `schema_migrations`, criada pelo executor:

| Grupo | Tabelas |
| --- | --- |
| Globais (sem RLS) | `users`, `teachers`, `invitations`, `notifications`, `login_attempts`, `app_meta` |
| Disciplinas | `subjects`, `subject_skills`, `subject_levels` |
| Alunos e turmas | `students`, `student_levels`, `classes`, `class_members` |
| Conteúdo | `passages`, `questions`, `activities`, `activity_items` |
| Envios e respostas | `assignments`, `assignment_students`, `submissions` |
| Aulas | `lessons`, `lesson_attendance` |

O diagrama de entidades está em [DIAGRAMA.md](DIAGRAMA.md#7-tabelas-e-relações), e a descrição de cada tabela na seção 6 da [DOCUMENTACAO.md](DOCUMENTACAO.md).

Escolhas do schema:
- **`teacher_id` em toda tabela de dados do professor, com chaves estrangeiras compostas** (por exemplo, `(teacher_id, subject_id, passage_id) → passages`). O próprio banco impede que uma questão do professor A aponte para um texto do professor B, ou para um texto de outra disciplina. Uma `activity_item` também não aceita questão de outra disciplina.
- **Chaves naturais para habilidade e nível** (`skill_key`, `level_code`, com FK `(subject_id, key)` e `ON UPDATE CASCADE`). O SQL fica legível (`WHERE skill_key = 'grammar'`) e o app quase não mudou, porque já tratava habilidade e nível como texto.
- **JSONB só onde o conteúdo varia:** `source`, `content` e `answer_key` das questões, `snapshot` dos envios (a cópia congelada), e `responses` e `answers` das tentativas. O resto virou coluna.
- **Etiquetas como `text[]` com índice GIN:** são uma lista simples sem atributos, então uma tabela de ligação não ajudaria.
- **Integridade no banco:**
  - `CHECK` nas situações e nos limites;
  - índice único parcial que impede duas tentativas abertas para o mesmo aluno e envio;
  - FK `(assignment_id, student_id) → assignment_students`: só quem recebeu o envio pode ter tentativa;
  - `CHECK` de que uma aula é de um aluno **ou** de uma turma.

### 1.2 Login separado do cadastro do aluno

- `users` é só a conta de login e não sabe a que professor pertence.
- `students` é o cadastro feito pelo professor, ligado a `users` por `user_id`.
- A regra atual (um aluno, um professor) é garantida pelo índice único parcial `students_one_per_user`. Para unificar contas no futuro, basta remover esse índice e ajustar a sessão para escolher o professor. O resto do código já procura o aluno pela conta (`studentForUser`).

### 1.3 Disciplinas

- **Modelo de disciplina:** fica no código, em [lib/subjects.ts](../lib/subjects.ts). Hoje existe só o modelo `english`, com as 5 habilidades e os níveis A1–C2 que eram fixos.
- **Ao criar um professor:** na mesma transação, a disciplina Inglês é criada a partir do modelo; as habilidades e os níveis são copiados para as tabelas dele.
- **O que pertence a uma disciplina:** questões, leituras, atividades e turmas. O nível do aluno é registrado por disciplina (`student_levels`).
- **Tipos de questão:** [lib/question-types.ts](../lib/question-types.ts) ganhou `TYPE_SUBJECTS`, que diz em quais disciplinas cada tipo pode ser usado (hoje todos são `"all"`). O editor só oferece os tipos permitidos, e o servidor recusa um tipo fora da disciplina.

### 1.4 Acesso ao banco

- **Biblioteca: `pg` (node-postgres), com SQL escrito à mão e uma camada fina de mapeamento** ([server/db/repo.ts](../server/db/repo.ts)). Não usei ORM nem query builder: o SQL fica visível e revisável, como você pediu.
- **Por que `pg` e não `@neondatabase/serverless`:**
  - o modo HTTP do driver do Neon não mantém transação interativa nem configuração por transação, e a RLS por transação depende disso;
  - o modo WebSocket faz o mesmo que o `pg`, mas o `pg` é o padrão e roda igual no app, nos scripts e nos testes.
- **Pool na Vercel:** `attachDatabasePool` de `@vercel/functions` (recomendação atual para Fluid compute), com `max: 5` e conexões ociosas fechadas em 5 s.
- **Tipos:** `numeric` vira `number`, `date` fica como texto `AAAA-MM-DD` (sem conversão de fuso) e `timestamptz` vira texto ISO. Há teste cobrindo os dois primeiros.
- **Interface do repositório:** a mesma forma de antes (`students.all(escopo)`, `.get`, `.put`), agora com SQL. Para operações em várias tabelas existe `withScope(escopo, r => …)`, que roda tudo numa transação.

### 1.5 RLS e o papel `app_user`

**Achado importante:** o papel que o Neon entrega nas URLs, `neondb_owner`, tem `rolbypassrls = true`. Resultado da consulta `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user`:

| Papel | rolbypassrls | rolsuper |
| --- | --- | --- |
| `neondb_owner` (conexão das URLs) | **true** | false |
| `app_user` (criado pela migração) | false | false |

Com BYPASSRLS, nem o `FORCE ROW LEVEL SECURITY` tem efeito. A solução escolhida foi:
- a migração cria o papel `app_user`: sem login, sem BYPASSRLS, sem ser dono de nada, com acesso só de leitura e escrita às tabelas. O `CREATE ROLE` é idempotente (bloco `DO` que verifica `pg_roles`), porque papéis são do cluster e a migração roda em vários schemas de teste e, depois, na branch main;
- o app continua conectando com as mesmas URLs, mas **toda transação começa com `SET LOCAL ROLE app_user`** e depois define o contexto com `set_config('app.teacher_id' | 'app.student_id' | 'app.system', …, true)`. Os dois valem só dentro da transação, o que funciona com o PgBouncer do Neon em modo transação. Um `SET` de sessão se perderia;
- a RLS está ativa e forçada nas 16 tabelas com `teacher_id`.

**Garantia de que nenhuma consulta escapa:**
- O pool é privado em [server/db/client.ts](../server/db/client.ts); a única função que abre conexão é `transaction()`, que sempre faz o `SET LOCAL ROLE`.
- O teste [tests/db-access.test.mts](../tests/db-access.test.mts) falha se qualquer arquivo de `app/`, `components/`, `lib/` ou `server/` (fora do `client.ts`) importar o `pg`, criar `Pool`/`Client`, ler `DATABASE_URL` ou trocar o papel do banco. Ele também confere que o `client.ts` não exporta o pool.
- Para confirmar que o teste acusa de verdade, criei um arquivo com uso direto do pool: o teste falhou. Depois apaguei o arquivo.

**O que roda como dono e o que roda em modo `system`.** O modo `system` **não** é o dono: é o `app_user` com uma política (`app_is_system()`) que libera todas as linhas.

| Operação | Papel | Modo | Por quê |
| --- | --- | --- | --- |
| Migrações (`npm run db:migrate`) | `neondb_owner` | — | Criam tabelas, políticas e o `app_user` |
| Backup (`npm run db:backup`) | `neondb_owner` | — | O `pg_dump` precisa ler tudo |
| Conexão de verificação dos testes | `neondb_owner` | — | Confere os resultados de fora da RLS |
| Seed de demonstração | `app_user` | `system` | Grava dados de dois professores numa transação |
| Contagens do painel do administrador | `app_user` | `system` | Agrega números de todos os professores, sem trazer dados de alunos |
| Achar o aluno pela conta de login | `app_user` | `system`, só por `user_id` | A conta não sabe a que professor pertence |
| Todo o resto do app | `app_user` | professor ou aluno | — |

**Políticas:**
- **Professor:** acesso total às próprias linhas.
- **Aluno:** não vê questões, leituras, atividades nem turmas (nem o gabarito em `questions.answer_key`). Vê só o próprio cadastro (e pode alterar telefone e pedido de exclusão), as próprias tentativas, os envios atribuídos a ele e as aulas dele ou da turma dele.
- **Sem contexto:** nenhuma linha.

### 1.6 Transações

Cada operação abaixo roda numa única transação (`withScope`):

| Operação | Tabelas | Onde |
| --- | --- | --- |
| Enviar atividade | `assignments` (com a cópia congelada), `assignment_students`, `notifications` | `services/assignments.ts` · `createAssignment` |
| Entregar (aluno) | `submissions` (travada com `FOR UPDATE`), `notifications` | `services/flows.ts` · `submitAttemptTx` |
| Corrigir | `submissions` (travada), `notifications` | `services/flows.ts` · `gradeAttemptTx` |
| Excluir aluno (LGPD) | `students` e, por cascata, tentativas, envios, turmas, aulas, convites, níveis; depois `users` | `services/flows.ts` · `deleteStudentTx` |
| Cancelar envio | `assignments` e, por cascata, `assignment_students` e `submissions` | `actions/activities.ts` |
| Cadastro de professor | `users`, `teachers`, `subjects`, `subject_skills`, `subject_levels` | `services/accounts.ts` |
| Aceitar convite | `users`, `students`, `invitations`, `notifications` | `actions/auth.ts` |
| Agendar aulas em série | `lessons`, `notifications` | `actions/lessons.ts` |

A lógica de entrega, correção e exclusão foi tirada das Server Actions e levada para `server/services/flows.ts`, para poder ser testada sem o Next.

### 1.7 Seed, scripts e desenvolvimento local

- **Seed** ([server/db/seed.ts](../server/db/seed.ts)): grava no Postgres numa transação em modo `system` e continua controlado por `SEED_DEMO`.
  - Roda sozinho no primeiro acesso. A marca em `app_meta` é gravada na mesma transação: se o seed falhar, nada fica pela metade, e outra instância que tente ao mesmo tempo espera e não repete.
  - Como você pediu, a professora Sarah tem uma segunda disciplina, "Inglês para negócios", com 2 questões.
- **Executor de migrações** ([scripts/migrate.mjs](../scripts/migrate.mjs), cerca de 100 linhas):
  - aplica cada arquivo pendente numa transação, registra em `schema_migrations` e usa advisory lock;
  - num banco que não seja o do `.env.local`, exige `--confirmar`;
  - `--reset` só funciona com o `.env.local`.
- **Backup** ([scripts/backup.mjs](../scripts/backup.mjs)): `pg_dump -Fc` com data e hora no nome, numa pasta fora do repositório.
  - Recusa uma pasta dentro do repositório e explica como instalar o `pg_dump` quando falta.
  - Acha o `pg_dump` no PATH ou, no Windows, em `C:\Program Files\PostgreSQL\<versão>\bin`, porque o instalador não põe essa pasta no PATH.
  - Com `sslmode=verify-full`, passa ao `pg_dump` as autoridades certificadoras do próprio Node, num arquivo temporário. O libpq exige um arquivo de certificados, e no Windows o `sslrootcert=system` não enxerga os do sistema.
  - Testado de ponta a ponta na branch dev: dump de 103 KB com as 23 tabelas do `public`, as 28 políticas de RLS e as 9 tabelas do schema `neon_auth` (criado pela integração Neon Auth).
- **Desenvolvimento local:** `.env.local` apontando para a branch dev do Neon, depois `npm run db:migrate` e `npm run dev`. Está documentado no README e na documentação.
- **Removido:** os drivers de Redis, arquivo e memória, a faixa de "modo demonstração" e as variáveis `KV_*`.

### 1.8 Alternativas descartadas

| Alternativa | Por que não |
| --- | --- |
| ORM (Prisma, Drizzle) | Esconde o SQL. O schema tem FKs compostas, índices parciais e RLS, que ficam mais claros em SQL puro |
| `node-pg-migrate` ou similar | Um executor de cerca de 100 linhas resolve, e o SQL fica exatamente como escrito |
| Driver HTTP do Neon (`neon()`) | Não mantém transação interativa nem `set_config` por transação |
| `SET` de sessão para o contexto da RLS | Se perde no PgBouncer em modo transação |
| Contar só com `FORCE ROW LEVEL SECURITY` | Não funciona: `neondb_owner` tem BYPASSRLS |
| Papel `app_user` com login e senha próprios | Mais forte, mas exigiria trocar o `DATABASE_URL` à mão na Vercel, e a integração Neon-Vercel pode sobrescrevê-lo. Você escolheu o `SET ROLE`; fica como evolução (ver Pendências) |
| Ids para habilidade e nível | Chaves naturais deixam o SQL legível e mudam menos o app |
| Banco local (Docker ou PGlite) nos testes | O PGlite roda como superusuário e ignoraria a RLS. Os testes usam a própria branch dev, num schema temporário, com o mesmo papel do app |

## 2. O que mudou na interface

O componente `SubjectPicker` só aparece quando o professor tem **duas ou mais disciplinas**. Com uma só, vira um campo oculto e as telas ficam como antes; isso foi testado com o professor John.

| Tela | Mudança (com 2+ disciplinas) |
| --- | --- |
| Nova/editar questão | Escolha da disciplina; habilidades, níveis, textos de leitura e tipos passam a ser os da disciplina |
| Nova atividade | Escolha da disciplina (fixa depois de criada); o banco mostra só as questões dela |
| Novo texto de leitura, nova turma | Escolha da disciplina; os níveis vêm dela |
| Cadastro de aluno | Um campo de nível por disciplina; da segunda em diante, há a opção "Não estuda esta disciplina" |
| Listas de questões, leituras, atividades e turmas; relatórios | Abas de filtro por disciplina |
| Ficha e perfil do aluno | Nível em cada disciplina |

Sempre (com qualquer número de disciplinas):
- os rótulos de habilidade nos gráficos vêm da disciplina e da cópia congelada do envio, e não mais de constantes fixas;
- o painel do administrador mostra "Banco: PostgreSQL (Neon)" no lugar do tipo de armazenamento.

## 3. Testes

### 3.1 Automáticos (`npm test`)

| Arquivo | Testes | O que cobre |
| --- | --- | --- |
| `tests/question-types.test.mts` | 11 | Corretores (já existiam) |
| `tests/db-access.test.mts` | 2 | Nenhum acesso ao banco fora do `withScope`; o `client.ts` não exporta o pool |
| `tests/db/isolation.test.mts` | 10 | Ver abaixo |
| `tests/db/transactions.test.mts` | 9 | Ver abaixo |

`tests/db/isolation.test.mts` verifica:
- o papel efetivo é `app_user`, sem BYPASSRLS;
- o dono, sem o `SET ROLE`, veria tudo;
- a RLS está ativa e forçada em todas as tabelas com `teacher_id`;
- **SQL cru sem filtro de `teacher_id`, no contexto de A, não devolve linhas de B** (14 tabelas);
- A não altera nem apaga linhas de B;
- A não grava em nome de B (`WITH CHECK`);
- a FK composta impede apontar para o texto de outro professor;
- sem contexto, nada aparece;
- o aluno não lê questões, gabarito, atividades nem textos, e não se passa por outro aluno;
- `numeric` → `number` e `date` → `AAAA-MM-DD`.

`tests/db/transactions.test.mts` verifica:
- um envio com aluno de outro professor é desfeito por inteiro;
- o envio grava a cópia congelada (editar a questão depois não muda o envio);
- uma entrega que falha no meio não deixa a tentativa pela metade;
- entrega e correção gravam nota e notificação;
- uma correção que falha no meio não grava a nota;
- **duas entregas simultâneas da mesma tentativa: só uma corrige e notifica**;
- não abre duas tentativas ao mesmo tempo;
- cancelar o envio apaga as tentativas;
- excluir o aluno apaga conta, tentativas, convites, níveis e vínculos.

Os testes de banco rodam na branch dev, num schema `test_<data>_<aleatório>` apagado no fim. Ao iniciar, a suíte apaga schemas `test_*` com mais de 30 minutos, que sobram de execuções interrompidas. Depois da execução, conferi que não ficou nenhum. Sem `DATABASE_URL_UNPOOLED`, os testes de banco são pulados com um aviso.

A checagem de tipos e o build de produção passam.

### 3.2 Manuais (navegador, app local na branch dev)

- Login dos três perfis (professora com duas disciplinas, professor com uma, aluno, administrador).
- As 28 páginas do professor abrem sem erro.
- Banco de questões com abas de disciplina e filtro funcionando.
- Questão criada em "Inglês para negócios".
- Montador de atividades mostrando só as questões da disciplina escolhida.
- Professor com uma disciplina: nenhum seletor nem aba de disciplina, e o editor envia a disciplina por campo oculto.
- Aluno:
  - cabeçalho com o nível principal e perfil com o nível em cada disciplina;
  - leitura com cronômetro, rascunho salvo e recuperado depois de recarregar;
  - entrega com o gabarito escondido até o prazo;
  - HTML da tela de responder sem gabarito, resposta-modelo, `source` ou anotações privadas;
  - exportação de dados respeitando a regra do gabarito.
- Isolamento: o professor John recebe 404 ao abrir aluno, exportação, questão, atividade, correção e aula da Sarah (e com um id que nem é uuid).
- Cadastro de professor novo (a disciplina Inglês é criada junto), cadastro de aluno, convite, ativação e link de uso único.
- Exclusão definitiva do aluno, conferida no banco: aluno, conta de login, convites e níveis apagados.
- Painel do administrador com as contagens corretas.
- 15 telas do professor sem rolagem horizontal em 375 px.
- Logs do servidor sem erros.

No fim, a branch dev foi recriada (`npm run db:reset`) só com os dados de demonstração.

## 4. Problemas encontrados e diferenças em relação ao pedido

**Problemas encontrados:**
- **O primeiro `.env.local` apontava para a branch main (produção).** Nela só rodei consultas de leitura (id da branch, papel, versão e contagem de tabelas); nada foi gravado. Você trocou as URLs pelas da branch dev, e conferi o id antes de qualquer gravação.
- **O arquivo foi salvo como `.env.local.txt`** pelo Windows; renomeei.
- **`neondb_owner` tem BYPASSRLS** (ver 1.5); daí o papel `app_user`.
- **Vazamento antigo, corrigido:** a exportação de dados do aluno incluía a "resposta esperada" mesmo quando a atividade estava configurada para nunca mostrar o gabarito. Agora segue a mesma regra da tela de resultado.
- **Aviso do `pg` sobre SSL:** com `sslmode=require`, a versão atual do `pg` já validava o certificado como `verify-full`, mas avisava que a próxima versão principal vai mudar isso. As URLs do `.env.local` e do Preview passaram para `sslmode=verify-full`. A conexão foi conferida: TLS 1.3, com o certificado do Neon (Let's Encrypt) validado, e o aviso sumiu.
- **`sslmode=verify-full` no `pg_dump`:** o libpq exige um arquivo de certificados raiz e, no Windows, `sslrootcert=system` falha. O script de backup resolve isso sozinho (ver 1.7). **Não** acrescente `sslrootcert` às URLs do `.env.local` ou da Vercel: o driver `pg` do app leria o valor como caminho de arquivo e deixaria de conectar.
- **O servidor do Neon é PostgreSQL 18.** Instalei pelo winget (`PostgreSQL.PostgreSQL.18`) só as ferramentas de cliente, sem o servidor, o pgAdmin e o Stack Builder: `pg_dump` e `pg_restore` 18.6. A pasta `bin` não foi posta no PATH; o script de backup a encontra sozinho.

**Diferenças em relação ao pedido ou ao comportamento anterior:**
- **Papel separado sem login próprio:** a conexão do app ainda é a do dono, e a RLS vale por causa do `SET LOCAL ROLE`. Uma injeção de SQL poderia, em tese, desfazer isso com `RESET ROLE`. O risco é mitigado porque todas as consultas usam parâmetros e há o teste que impede trocar o papel no código. Um papel com login próprio eliminaria esse risco.
- **Excluir uma turma agora apaga as aulas da turma** (cascata). Antes, as aulas ficavam órfãs com "Turma removida".
- **`invitations` não tem RLS:** o convite é procurado pelo token antes de qualquer login. O token tem 192 bits aleatórios.
- **Envios guardam o gabarito na cópia congelada,** e o aluno lê a linha do envio, mas isso nunca vai para o navegador. Separar a cópia em parte pública e parte privada reforçaria isso no banco.
- **Não há tela para criar disciplinas,** como combinado. A segunda disciplina de demonstração vem do seed.
- **Várias telas ainda carregam todas as linhas do professor e filtram no código** (mesma forma da versão anterior). Funciona com o volume de um professor; consultas específicas ficam para depois.
- **Os testes de banco precisam de rede** (branch dev do Neon). Num ambiente de CI, será preciso uma branch de testes e a variável `DATABASE_URL_UNPOOLED`.

## 5. PRÓXIMOS PASSOS PARA O DESENVOLVEDOR

### Concluídos

- [x] **Revisar o código** da branch `fase1-postgres`.
- [x] **Instalar o `pg_dump` 18:** só as ferramentas de cliente, em `C:\Program Files\PostgreSQL\18\bin`; o `npm run db:backup` encontra a pasta sozinho.
- [x] **Migrar a branch main do Neon (produção)**, antes do merge:
  - backup antes da migração (`teacher-sarah-20261026-144016.dump`, em `~/teacher-sarah-backups`);
  - migração `0001_init` aplicada;
  - `app_user` conferido: sem BYPASSRLS, sem login e sem ser superusuário;
  - arquivo temporário com as credenciais de produção apagado.
- [x] **Variáveis de Produção na Vercel:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SEED_DEMO=false`. Não havia variáveis `KV_*` nem `UPSTASH_*`.
- [x] **Preview apontando para a branch dev:** a integração Neon-Vercel ficou ligada só ao ambiente Production; o Preview usa `DATABASE_URL` e `DATABASE_URL_UNPOOLED` criadas à mão, com as URLs da branch dev.
- [x] **`sslmode=verify-full`** no `.env.local` e no Preview.
- [x] **Pull request #1 juntado na `main`.**
- [x] **Testado em produção:**
  - o login do administrador funciona;
  - o login de demonstração não funciona, como esperado;
  - o cadastro de professor cria a disciplina Inglês;
  - o administrador lista e bloqueia professores.
- [x] **Região das funções da Vercel** trocada de Washington (`iad1`) para São Paulo (`gru1`), a mesma do banco.
- [x] **Domínio de produção:** https://app-docentia.vercel.app (o antigo teacher-sarah.vercel.app redireciona para ele).

### Em aberto

1. **Papel do banco com login próprio.** Hoje o app conecta como `neondb_owner` e a RLS vale porque toda transação faz `SET LOCAL ROLE app_user`; uma injeção de SQL poderia, em tese, desfazer isso com `RESET ROLE` (ver seção 4). Para eliminar esse risco:
   1. Crie no Neon, nas branches dev e main, um papel com login, sem BYPASSRLS e membro de `app_user`.
   2. Use a URL desse papel como `DATABASE_URL` (o app).
   3. O `DATABASE_URL_UNPOOLED` continua com o dono, para migrações e backup.
   4. Na Vercel, como a variável de Produção vem da integração, será preciso sobrescrevê-la à mão ou desligar a integração para essa variável.
2. **Trocar a senha da branch dev do Neon:**
   1. No console do Neon: branch dev → **Roles** → `neondb_owner` → **Reset password**.
   2. Atualize as duas URLs no `.env.local` e nas variáveis de Preview da Vercel.
   3. Refaça o deploy do preview.

### Rotina

- **Backup:** use `npm run db:backup` para a branch dev. Para a produção, crie um arquivo temporário com as URLs da main (`sslmode=verify-full`), rode `npm run db:backup -- --env-file=<arquivo>` e apague o arquivo depois. Para restaurar: `pg_restore --clean --no-owner -d "<URL sem pooling>" arquivo.dump`. Destino e agendamento continuam por configurar.
- **Próximas migrações:** crie `db/migrations/0002_<nome>.sql`. Rode na dev com `npm run db:migrate` e, **antes de juntar na `main`**, na produção com `--env-file=<arquivo temporário> --confirmar`.
