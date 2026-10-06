# Teacher Sarah: plataforma para professores de inglês

Cada professor tem seu próprio espaço, com alunos, turmas, banco de questões, atividades, correção, agenda e relatórios. O aluno entra pela página do professor e vê só o que foi passado para ele.

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4. A estrutura completa do sistema está no documento de arquitetura do projeto.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Na primeira vez, o sistema cria dados de demonstração em `.data/db.json` (ignorado pelo git). Para recomeçar do zero, apague a pasta `.data`.

As contas de demonstração estão listadas no topo de [server/db/seed.ts](server/db/seed.ts): dois professores (para ver o isolamento entre eles), seis alunos e, só em ambiente local, um administrador.

```bash
npm test
```

O comando acima roda os testes dos corretores automáticos (`tests/`).

## Onde ficam os dados

O código acessa os dados só por [server/db/repo.ts](server/db/repo.ts). O armazenamento é escolhido sozinho:

| Situação | Armazenamento | Persistente? |
| --- | --- | --- |
| `KV_REST_API_URL` e `KV_REST_API_TOKEN` definidos | Redis (Upstash / Vercel KV) | Sim |
| Rodando local, sem Redis | Arquivo `.data/db.json` | Sim, na sua máquina |
| Na Vercel, sem Redis | Memória | **Não**: some quando a função reinicia |

Sem Redis na Vercel, o app mostra uma faixa amarela de "modo demonstração".

## Publicar na Vercel com Redis

1. No projeto da Vercel: **Storage → Create Database → Upstash for Redis** (o plano gratuito basta para o protótipo) e conecte ao projeto. Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
2. Em **Settings → Environment Variables**, defina:
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: conta de administrador criada no primeiro acesso.
   - `SEED_DEMO=false` se não quiser as contas de demonstração (recomendado quando professores reais forem usar, porque as senhas de demonstração estão públicas no repositório).
   - `SESSION_SECRET` (opcional): se vazio, um segredo aleatório é gerado e guardado no Redis.
3. Faça o deploy. Os dados iniciais são criados no primeiro acesso.

Veja [.env.example](.env.example).

## Organização

```text
app/(publico)/     página inicial, entrar, cadastro, convite, página do professor (/p/[slug]), termos
app/professor/     área do professor
app/aluno/         área do aluno
app/admin/         administração da plataforma
components/        UI; questions/ tem o editor e o "player" de cada tipo de questão
lib/question-types.ts   os 8 tipos de questão: formato, construção, correção
server/auth/       senha (scrypt), sessão em cookie assinado, guardas de acesso
server/actions/    Server Actions (toda ação confere o usuário e o dono do dado)
server/db/         armazenamento (driver), repositório e dados de demonstração
server/services/   atribuição, correção, progresso, exportação, notificações
proxy.ts           redireciona para o login quem não tem sessão
```

## Segurança

- Dados de um professor ficam em chaves `t:<id do professor>:...`, e as funções de acesso exigem o id do professor logado. Um professor não alcança dados de outro.
- O gabarito nunca vai para o navegador do aluno antes da correção; a correção roda no servidor.
- Tempo limite e prazo são conferidos no servidor.
- Senhas com scrypt + sal; sessão em cookie `httpOnly` assinado com HMAC; limite de 5 tentativas de login a cada 15 minutos.
- O aluno exporta os próprios dados e pede exclusão (LGPD); o professor exporta e exclui os dados do aluno.
