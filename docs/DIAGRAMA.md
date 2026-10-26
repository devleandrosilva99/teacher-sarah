# Diagrama do sistema Docentia: telas e funções

O projeto começou como o protótipo "Teacher Sarah"; a plataforma agora se chama Docentia.

Estado em 26/10/2026: em produção com a Fase 1 (PostgreSQL e disciplinas); a Fase 2 (turmas arquivadas, desempenho, e-mail, WhatsApp, upload de arquivos e papel do banco com login próprio) está no pull request da branch `fase2` e já aparece nestes diagramas. Eles usam Mermaid e aparecem desenhados no GitHub e em editores com suporte a Mermaid.

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
    ENT -->|Esqueci minha senha| REC["/recuperar-senha<br/>Pede o link por e-mail"]
    REC -. e-mail .-> RED["/redefinir-senha/[token]<br/>Nova senha (1 h, uso único)"]
    CAD -. e-mail .-> VER["/verificar-email/[token]<br/>Confirma o e-mail (24 h)"]

    CAD --> PR
    RED --> PR
    RED --> AL
    ENT -->|papel = professor| PR["/professor<br/>Área do professor"]
    ENT -->|papel = aluno| AL["/aluno<br/>Área do aluno"]
    ENT -->|papel = admin| AD["/admin<br/>Administração"]

    PR -. gera link, manda por<br/>WhatsApp ou e-mail .-> CONV
    PR -. envia atividades,<br/>agenda aulas .-> AL
    AL -. entrega respostas<br/>e arquivos .-> PR
    AD -. bloqueia/desbloqueia ·<br/>link de redefinição .-> PR

    ARQ["/arquivos/[id]<br/>Download com permissão<br/>(404 para quem não pode ver)"]
    PR --> ARQ
    AL --> ARQ

    SAIR["/sair<br/>Encerra a sessão"]
    PR --> SAIR
    AL --> SAIR
    AD --> SAIR
```

## 2. Área do professor

```mermaid
flowchart LR
    P["/professor<br/>Início<br/>• Aviso para confirmar o e-mail<br/>• Primeiros passos<br/>• Resumo: alunos, para corrigir,<br/>aulas da semana, atrasadas<br/>• Próximas aulas<br/>• Alunos que precisam de atenção"]

    subgraph ALUNOS["Alunos"]
        A1["/professor/alunos<br/>Lista, busca, ativos/arquivados,<br/>média e pendências"]
        A2["/professor/alunos/novo<br/>Cadastro (dados, nível, CPF e<br/>endereço opcionais, notas privadas)"]
        A3["/professor/alunos/[id]<br/>Ficha: link de acesso (copiar,<br/>WhatsApp, e-mail), métricas, gráfico<br/>de notas, por habilidade, atividades,<br/>aulas, dados"]
        A4["/professor/alunos/[id]/editar"]
        A5["/professor/alunos/[id]/exportar<br/>Baixa JSON (LGPD, com arquivos)"]
        A1 --> A2 --> A3
        A1 --> A3
        A3 --> A4
        A3 --> A5
        A3 -->|"Gerar link · Arquivar/Reativar ·<br/>Excluir definitivamente"| A3
    end

    subgraph TURMAS["Turmas"]
        T1["/professor/turmas<br/>Abas Ativas · Arquivadas"]
        T2["/professor/turmas/nova"]
        T3["/professor/turmas/[id]<br/>Editar membros · Passar atividade ·<br/>Agendar aula · Arquivar/Restaurar ·<br/>Excluir (só sem aula realizada)"]
        T1 --> T2
        T1 --> T3
    end

    subgraph BANCO["Banco de questões"]
        Q1["/professor/questoes<br/>Abas de disciplina (2+) · filtros<br/>no banco: tipo, habilidade, nível,<br/>etiqueta, situação, busca"]
        Q2["/professor/questoes/nova<br/>Disciplina (se houver 2+) ·<br/>Editor dos 9 tipos · mídia por link<br/>ou Enviar arquivo · Ver como aluno"]
        Q3["/professor/questoes/[id]<br/>Editar · Duplicar · Arquivar"]
        L1["/professor/leituras<br/>Textos e áudios"]
        L2["/professor/leituras/nova<br/>Áudio por link ou arquivo"]
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
        V3["/professor/atividades/[id]<br/>Enviar para alunos/turmas ativas<br/>com liberação e prazo · Envios com<br/>status por aluno · WhatsApp para<br/>quem tem pendência · Mudar prazo ·<br/>Cancelar envio · Arquivar"]
        V4["/professor/atividades/[id]/editar"]
        V1 --> V2 --> V3
        V1 --> V3 --> V4
    end

    subgraph CORR["Correção"]
        C1["/professor/correcao<br/>Fila para corrigir ·<br/>Corrigidas recentemente"]
        C2["/professor/correcao/[id]<br/>Respostas + gabarito · arquivos<br/>enviados · nota e comentário por<br/>questão · comentário geral ·<br/>Salvar e ir para a próxima"]
        C1 --> C2
    end

    subgraph AGENDA["Agenda"]
        G1["/professor/agenda<br/>Agendar (aluno ou turma ativa,<br/>repetir semanal) · Próximas/anteriores"]
        G2["/professor/agenda/[id]<br/>Editar · situação · o que foi visto ·<br/>vocabulário · presença · Excluir<br/>(uma ou a série)"]
        G1 --> G2
    end

    R["/professor/relatorios<br/>Filtro por turma (ativas e<br/>arquivadas) · média geral ·<br/>por habilidade · alunos (menor<br/>média primeiro) · questões com<br/>mais erros"]
    N["/professor/notificacoes<br/>Lista · Marcar como lidas"]
    S["/professor/configuracoes<br/>Nome, endereço /p/slug, apresentação,<br/>cor da marca · Trocar senha<br/>(encerra as outras sessões)"]

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
        S3["/aluno/atividades/[id]/fazer<br/>Responder: texto de leitura ao lado ·<br/>Anexar arquivo (fotos reduzidas no<br/>celular) · cronômetro · rascunho<br/>automático · progresso · Entregar"]
        S4["/aluno/atividades/[id]/resultado<br/>Nota ou 'aguardando correção' ·<br/>arquivos enviados · comentários ·<br/>gabarito e explicação (conforme a<br/>regra da atividade)"]
        S1 --> S2 --> S3 --> S4
        S2 --> S4
    end

    AG["/aluno/agenda<br/>Próximas aulas (link) ·<br/>anteriores com o que foi visto,<br/>vocabulário e faltas"]
    PG["/aluno/progresso<br/>Média, feitas, pendentes,<br/>atrasadas · evolução · por habilidade"]
    PF["/aluno/perfil<br/>Dados · telefone · trocar senha ·<br/>Baixar meus dados · Pedir exclusão"]
    EX["/aluno/perfil/exportar<br/>JSON (LGPD, com a lista de arquivos)"]
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
    AD["/admin<br/>Totais: professores, bloqueados,<br/>alunos ativos, atividades enviadas ·<br/>papel do banco conectado (aviso<br/>se for o dono)"]
    AD --> LT["Lista de professores<br/>nome, e-mail, página, nº de alunos,<br/>nº de questões, e-mail verificado, data"]
    LT -->|Bloquear / Desbloquear| B["Professor e seus alunos<br/>perdem/recuperam o acesso"]
    LT -->|Enviar link de redefinição| M["E-mail ao professor com link<br/>para ele criar a senha nova<br/>(o admin não vê nem define senha)"]
```

## 5. Ciclo de uma atividade

```mermaid
sequenceDiagram
    actor Prof as Professor
    participant Sis as Sistema (servidor)
    actor Al as Aluno

    Prof->>Sis: Cria questões no banco (9 tipos, leituras, mídias enviadas)
    Prof->>Sis: Monta atividade (questões, pontos, regras)
    Prof->>Sis: Envia para alunos/turmas (liberação, prazo)
    Sis->>Sis: Guarda cópia congelada das questões e liga as mídias ao envio
    Sis-->>Al: Notificação "Nova atividade"
    Prof-->>Al: (opcional) Aviso pelo WhatsApp, com o link e o prazo
    Al->>Sis: Começar (abre tentativa, inicia cronômetro)
    Sis-->>Al: Questões SEM gabarito
    loop A cada mudança (1,5 s)
        Al->>Sis: Salva rascunho (arquivos: só os do aluno, desta tentativa)
    end
    Al->>Sis: Entregar (ou entrega automática quando o tempo acaba)
    Sis->>Sis: Corrige no servidor as questões objetivas
    alt Só questões objetivas
        Sis-->>Al: Nota imediata
    else Tem resposta aberta ou entrega de arquivo
        Sis-->>Prof: Notificação "tem resposta para corrigir"
        Prof->>Sis: Dá nota e comentários (baixa os arquivos)
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

    Prof->>Sis: Cadastra aluno (nome, e-mail, telefone, nível)
    Prof->>Sis: Gerar link de acesso
    Sis-->>Prof: /convite/[token] (7 dias, uso único)
    alt Copiar ou WhatsApp
        Prof-->>Al: Envia o link (o WhatsApp abre com a mensagem pronta)
    else Enviar por e-mail
        Sis-->>Al: E-mail com o link
    end
    Al->>Sis: Abre o link, cria senha, aceita termos<br/>(menor de idade: autorização do responsável)
    Sis-->>Prof: Notificação "aluno ativou a conta"
    Sis-->>Al: Entra direto na área do aluno
    Note over Al,Sis: Próximos acessos: /entrar ou /p/[slug] do professor.<br/>Esqueceu a senha: /recuperar-senha
```

## 7. Tabelas e relações

Toda tabela com `teacher_id` tem RLS forçada, e as chaves estrangeiras entre elas incluem `teacher_id`. As tabelas globais (`users`, `teachers`, `invitations`, `notifications`, `auth_tokens`, `rate_limits`, `app_meta` e a antiga `login_attempts`, que não é mais usada) não têm dono de professor.

```mermaid
erDiagram
    users ||--o| teachers : "login do professor"
    users ||--o| students : "login do aluno"
    users ||--o{ notifications : recebe
    users ||--o{ auth_tokens : "links de e-mail (hash)"
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
    classes ||--o{ lessons : "aula da turma (RESTRICT)"
    lessons ||--o{ lesson_attendance : presença
    teachers ||--o{ files : "mídias e entregas"
    students |o--o{ files : "entregas do aluno"
    submissions |o--o{ files : "arquivos da tentativa"
    assignments ||--o{ assignment_files : "mídias do envio"
    files ||--o{ assignment_files : "RESTRICT"
```

## 8. Uma consulta do app, passo a passo

Toda consulta passa por `withScope`. O início da transação vai numa ida só ao banco: assume o papel `app_user` (sem BYPASSRLS) e define o contexto que a RLS usa.

```mermaid
sequenceDiagram
    participant Tela as Página ou Server Action
    participant Repo as withScope (repo.ts)
    participant Ctx as contextLiteral (context-sql.ts)
    participant PG as PostgreSQL (Neon, pooler)

    Tela->>Repo: withScope(professor ou aluno, fn)
    Repo->>Ctx: valida uuid / "on" / identificador
    Ctx-->>Repo: literais seguros (ou erro, sem conectar)
    Note over Repo,PG: Conexão como app_login (DATABASE_APP_URL),<br/>que sozinho não lê nenhuma tabela
    Repo->>PG: BEGIN; SELECT set_config('role','app_user',true),<br/>set_config('app.teacher_id' / 'app.student_id', ..., true)
    Repo->>PG: consultas de fn, em sequência (SQL com parâmetros)
    PG-->>Repo: só as linhas que as políticas de RLS liberam
    alt tudo certo
        Repo->>PG: COMMIT
    else erro em qualquer passo
        Repo->>PG: ROLLBACK (nada fica gravado pela metade)
    end
    Repo-->>Tela: resultado
    Note over Repo,PG: set_config(..., true) vale só nesta transação, por isso funciona<br/>com o PgBouncer do Neon. Um RESET ROLE volta para app_login, não para o dono.
```

## 9. Recuperação de senha

```mermaid
sequenceDiagram
    actor U as Pessoa
    participant Sis as Sistema
    participant DB as Banco
    participant Mail as E-mail (SMTP)

    U->>Sis: /recuperar-senha (e-mail)
    Sis->>DB: conta pedido por IP e por e-mail (rate_limits)
    alt passou do limite (3 por e-mail / 10 por IP, por hora)
        Sis-->>U: "Muitos pedidos"
    else dentro do limite
        Sis->>DB: se a conta existe: invalida links antigos, grava o hash do novo (1 h)
        Sis-->>U: Mesma resposta, exista ou não a conta
        Sis->>Mail: envia o link depois da resposta (after)
    end
    U->>Sis: /redefinir-senha/[token] + nova senha
    Sis->>DB: gasta o token (uso único), grava a senha,<br/>sobe a versão da sessão, confirma o e-mail
    Sis-->>U: Sessão nova; as outras sessões da conta caem
```

## 10. Envio e download de arquivo

```mermaid
sequenceDiagram
    actor Al as Aluno (ou professor)
    participant Nav as Navegador
    participant Sis as Servidor
    participant DB as Banco (RLS)
    participant Arm as Armazenamento (Blob privado)

    Al->>Nav: Escolhe o arquivo
    Nav->>Nav: Foto: reduz para 1600 px (WebP/JPEG)
    Nav->>Sis: Pede o envio (nome, tipo, tamanho, questão)
    Sis->>DB: confere tentativa aberta, questão, tipo, tamanho e limite;<br/>cria a linha "pending"
    Sis-->>Nav: Autorização só para esta chave, este tipo e este tamanho (10 min)
    Nav->>Arm: Envia direto ao armazenamento
    Nav->>Sis: Confirma
    Sis->>Arm: head: tamanho e tipo reais
    alt confere
        Sis->>DB: marca "ready"
    else não confere
        Sis->>DB: apaga a linha
        Sis->>Arm: apaga o objeto
    end
    Al->>Sis: /arquivos/[id]
    Sis->>DB: busca o arquivo no escopo de quem pede
    alt pode ver
        Sis-->>Al: redireciona para URL assinada de 5 min
    else outro aluno, outro professor ou sem login
        Sis-->>Al: 404
    end
```
