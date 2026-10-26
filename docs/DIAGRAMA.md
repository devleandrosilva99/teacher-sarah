# Diagrama do sistema Docentia: telas e funções

O projeto começou como o protótipo "Teacher Sarah"; a plataforma agora se chama Docentia.

Estado em 26/10/2026 (em produção, com a Fase 1: PostgreSQL e disciplinas). Os diagramas usam Mermaid e aparecem desenhados no GitHub e em editores com suporte a Mermaid.

## 1. Visão geral: áreas e acesso

Três perfis entram pela mesma tela de login e cada um cai na sua área. As rotas privadas exigem sessão; os dados de cada professor ficam isolados.

```mermaid
flowchart TD
    V([Visitante]) --> HOME["/ <br/>Página inicial"]
    HOME --> CAD["/cadastro<br/>Criar conta de professor"]
    HOME --> ENT["/entrar<br/>Login único"]
    HOME --> TER["/termos · /privacidade"]

    TP["/p/[slug]<br/>Página do professor<br/>(login do aluno com a marca dele)"] --> ENT
    CONV["/convite/[token]<br/>Aluno cria a senha<br/>(link de uso único, 7 dias)"] --> AL

    CAD --> PR
    ENT -->|papel = professor| PR["/professor<br/>Área do professor"]
    ENT -->|papel = aluno| AL["/aluno<br/>Área do aluno"]
    ENT -->|papel = admin| AD["/admin<br/>Administração"]

    PR -. gera link .-> CONV
    PR -. envia atividades,<br/>agenda aulas .-> AL
    AL -. entrega respostas .-> PR
    AD -. bloqueia/desbloqueia .-> PR

    SAIR["/sair<br/>Encerra a sessão"]
    PR --> SAIR
    AL --> SAIR
    AD --> SAIR
```

## 2. Área do professor

```mermaid
flowchart LR
    P["/professor<br/>Início<br/>• Primeiros passos<br/>• Resumo: alunos, para corrigir,<br/>aulas da semana, atrasadas<br/>• Próximas aulas<br/>• Alunos que precisam de atenção"]

    subgraph ALUNOS["Alunos"]
        A1["/professor/alunos<br/>Lista, busca, ativos/arquivados,<br/>média e pendências"]
        A2["/professor/alunos/novo<br/>Cadastro (dados, nível, CPF e<br/>endereço opcionais, notas privadas)"]
        A3["/professor/alunos/[id]<br/>Ficha: link de acesso, métricas,<br/>gráfico de notas, por habilidade,<br/>atividades, aulas, dados"]
        A4["/professor/alunos/[id]/editar"]
        A5["/professor/alunos/[id]/exportar<br/>Baixa JSON (LGPD)"]
        A1 --> A2 --> A3
        A1 --> A3
        A3 --> A4
        A3 --> A5
        A3 -->|"Gerar link · Arquivar/Reativar ·<br/>Excluir definitivamente"| A3
    end

    subgraph TURMAS["Turmas"]
        T1["/professor/turmas<br/>Lista"]
        T2["/professor/turmas/nova"]
        T3["/professor/turmas/[id]<br/>Editar membros · Passar atividade ·<br/>Agendar aula · Excluir"]
        T1 --> T2
        T1 --> T3
    end

    subgraph BANCO["Banco de questões"]
        Q1["/professor/questoes<br/>Abas de disciplina (2+) · filtros:<br/>tipo, habilidade, nível, etiqueta,<br/>situação, busca"]
        Q2["/professor/questoes/nova<br/>Disciplina (se houver 2+) ·<br/>Editor dos tipos da disciplina +<br/>Ver como aluno"]
        Q3["/professor/questoes/[id]<br/>Editar · Duplicar · Arquivar"]
        L1["/professor/leituras<br/>Textos e áudios"]
        L2["/professor/leituras/nova"]
        L3["/professor/leituras/[id]<br/>Texto + suas questões ·<br/>Adicionar questão · Excluir"]
        Q1 --> Q2
        Q1 --> Q3
        L1 --> L2 --> L3
        L1 --> L3
        L3 -->|"?leitura=id"| Q2
    end

    subgraph ATIV["Atividades"]
        V1["/professor/atividades<br/>Lista · ativas/arquivadas"]
        V2["/professor/atividades/nova<br/>Disciplina (2+) · montar com as<br/>questões dela: pontos, ordem,<br/>tempo, tentativas, embaralhar,<br/>quando mostrar gabarito"]
        V3["/professor/atividades/[id]<br/>Enviar para alunos/turmas com<br/>liberação e prazo · Envios com<br/>status por aluno · Mudar prazo ·<br/>Cancelar envio · Arquivar"]
        V4["/professor/atividades/[id]/editar"]
        V1 --> V2 --> V3
        V1 --> V3 --> V4
    end

    subgraph CORR["Correção"]
        C1["/professor/correcao<br/>Fila para corrigir ·<br/>Corrigidas recentemente"]
        C2["/professor/correcao/[id]<br/>Respostas + gabarito · nota e<br/>comentário por questão · comentário<br/>geral · Salvar e ir para a próxima"]
        C1 --> C2
    end

    subgraph AGENDA["Agenda"]
        G1["/professor/agenda<br/>Agendar (aluno ou turma, repetir<br/>semanal) · Próximas/anteriores"]
        G2["/professor/agenda/[id]<br/>Editar · situação · o que foi visto ·<br/>vocabulário · presença · Excluir<br/>(uma ou a série)"]
        G1 --> G2
    end

    R["/professor/relatorios<br/>Filtro por turma · média geral ·<br/>por habilidade · alunos (menor<br/>média primeiro) · questões com<br/>mais erros"]
    N["/professor/notificacoes<br/>Lista · Marcar como lidas"]
    S["/professor/configuracoes<br/>Nome, endereço /p/slug, apresentação,<br/>cor da marca · Trocar senha"]

    P --> A1
    P --> T1
    P --> Q1
    P --> L1
    P --> V1
    P --> C1
    P --> G1
    P --> R
    P --> N
    P --> S
    A3 -->|Passar atividade| V1
    T3 -->|Passar atividade| V1
    V3 -->|Corrigir/Ver| C2
    A3 -->|Ver respostas| C2
```

## 3. Área do aluno

```mermaid
flowchart LR
    H["/aluno<br/>Início<br/>• Próxima aula + Entrar na aula<br/>• Média, feitas, pendentes<br/>• Para fazer"]

    subgraph ATV["Atividades"]
        S1["/aluno/atividades<br/>Em aberto · Entregues"]
        S2["/aluno/atividades/[id]<br/>Instruções, pontos, tempo, prazo ·<br/>Começar / Continuar / Fazer de novo ·<br/>Lista de entregas"]
        S3["/aluno/atividades/[id]/fazer<br/>Responder: texto de leitura ao lado ·<br/>cronômetro · rascunho automático ·<br/>progresso · Entregar"]
        S4["/aluno/atividades/[id]/resultado<br/>Nota ou 'aguardando correção' ·<br/>comentários · gabarito e explicação<br/>(conforme a regra da atividade)"]
        S1 --> S2 --> S3 --> S4
        S2 --> S4
    end

    AG["/aluno/agenda<br/>Próximas aulas (link) ·<br/>anteriores com o que foi visto,<br/>vocabulário e faltas"]
    PG["/aluno/progresso<br/>Média, feitas, pendentes,<br/>atrasadas · evolução · por habilidade"]
    PF["/aluno/perfil<br/>Dados · telefone · trocar senha ·<br/>Baixar meus dados · Pedir exclusão"]
    EX["/aluno/perfil/exportar<br/>JSON (LGPD)"]
    NT["/aluno/notificacoes"]

    H --> S1
    H --> AG
    H --> PG
    H --> PF
    H --> NT
    PF --> EX
```

## 4. Área do administrador

```mermaid
flowchart LR
    AD["/admin<br/>Totais: professores, bloqueados,<br/>alunos ativos, atividades enviadas"]
    AD --> LT["Lista de professores<br/>nome, e-mail, página, nº de alunos,<br/>nº de questões, data"]
    LT -->|Bloquear / Desbloquear| B["Professor e seus alunos<br/>perdem/recuperam o acesso"]
```

## 5. Ciclo de uma atividade

```mermaid
sequenceDiagram
    actor Prof as Professor
    participant Sis as Sistema (servidor)
    actor Al as Aluno

    Prof->>Sis: Cria questões no banco (8 tipos, leituras)
    Prof->>Sis: Monta atividade (questões, pontos, regras)
    Prof->>Sis: Envia para alunos/turmas (liberação, prazo)
    Sis->>Sis: Guarda cópia congelada das questões
    Sis-->>Al: Notificação "Nova atividade"
    Al->>Sis: Começar (abre tentativa, inicia cronômetro)
    Sis-->>Al: Questões SEM gabarito
    loop A cada mudança (1,5 s)
        Al->>Sis: Salva rascunho
    end
    Al->>Sis: Entregar (ou entrega automática quando o tempo acaba)
    Sis->>Sis: Corrige no servidor as questões objetivas
    alt Só questões objetivas
        Sis-->>Al: Nota imediata
    else Tem resposta aberta
        Sis-->>Prof: Notificação "tem resposta para corrigir"
        Prof->>Sis: Dá nota e comentários
        Sis-->>Al: Notificação "atividade corrigida"
    end
    Al->>Sis: Vê resultado
    Sis-->>Al: Gabarito só se a regra permitir
```

## 6. Entrada do aluno

```mermaid
sequenceDiagram
    actor Prof as Professor
    participant Sis as Sistema
    actor Al as Aluno

    Prof->>Sis: Cadastra aluno (nome, e-mail, nível)
    Prof->>Sis: Gerar link de acesso
    Sis-->>Prof: /convite/[token] (7 dias, uso único)
    Prof-->>Al: Envia o link (WhatsApp/e-mail, fora do sistema)
    Al->>Sis: Abre o link, cria senha, aceita termos<br/>(menor de idade: autorização do responsável)
    Sis-->>Prof: Notificação "aluno ativou a conta"
    Sis-->>Al: Entra direto na área do aluno
    Note over Al,Sis: Próximos acessos: /entrar ou /p/[slug] do professor
```

## 7. Tabelas e relações

Toda tabela com `teacher_id` tem RLS forçada, e as chaves estrangeiras entre elas incluem `teacher_id`. As tabelas globais (`users`, `teachers`, `invitations`, `notifications`, `login_attempts`, `app_meta`) não têm dono de professor.

```mermaid
erDiagram
    users ||--o| teachers : "login do professor"
    users ||--o| students : "login do aluno"
    users ||--o{ notifications : recebe
    teachers ||--o{ subjects : tem
    teachers ||--o{ students : cadastra
    subjects ||--o{ subject_skills : define
    subjects ||--o{ subject_levels : define
    students ||--o{ student_levels : "nível por disciplina"
    subject_levels ||--o{ student_levels : ""
    students ||--o{ invitations : recebe
    subjects ||--o{ classes : ""
    classes ||--o{ class_members : ""
    students ||--o{ class_members : ""
    subjects ||--o{ passages : ""
    subjects ||--o{ questions : ""
    passages |o--o{ questions : "texto de leitura"
    subject_skills ||--o{ questions : habilidade
    subjects ||--o{ activities : ""
    activities ||--o{ activity_items : ""
    questions ||--o{ activity_items : ""
    activities ||--o{ assignments : "envio (cópia congelada)"
    assignments ||--o{ assignment_students : ""
    students ||--o{ assignment_students : ""
    assignment_students ||--o{ submissions : tentativas
    students ||--o{ lessons : "aula individual"
    classes ||--o{ lessons : "aula da turma"
    lessons ||--o{ lesson_attendance : presença
```

## 8. Uma consulta do app, passo a passo

Toda consulta passa por `withScope`. Dentro da transação, o papel é `app_user` (sem BYPASSRLS), e o contexto define o que a RLS deixa ver.

```mermaid
sequenceDiagram
    participant Tela as Página ou Server Action
    participant Repo as withScope (repo.ts)
    participant PG as PostgreSQL (Neon, pooler)

    Tela->>Repo: withScope(professor ou aluno, fn)
    Repo->>PG: BEGIN
    Repo->>PG: SET LOCAL ROLE app_user
    Repo->>PG: set_config('app.teacher_id' / 'app.student_id', ..., true)
    Repo->>PG: consultas de fn (SQL com parâmetros)
    PG-->>Repo: só as linhas que as políticas de RLS liberam
    alt tudo certo
        Repo->>PG: COMMIT
    else erro em qualquer passo
        Repo->>PG: ROLLBACK (nada fica gravado pela metade)
    end
    Repo-->>Tela: resultado
    Note over Repo,PG: O SET LOCAL e o set_config(..., true) valem só nesta transação,<br/>por isso funcionam com o PgBouncer do Neon em modo transação.
```
