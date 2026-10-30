# Docentia: plataforma para professores de inglês

Em produção em https://app-docentia.vercel.app. O projeto começou como o protótipo "Teacher Sarah", de uma única professora; o nome do repositório e da pasta continuam os antigos.

Cada professor tem seu próprio espaço, com disciplinas, alunos, turmas, banco de questões, atividades, correção, agenda e relatórios. O aluno entra pela página do professor e vê só o que foi passado para ele.

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 + PostgreSQL (Neon). A documentação completa está em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md), e os diagramas em [docs/DIAGRAMA.md](docs/DIAGRAMA.md).

## Desenvolvimento local

O desenvolvimento usa a **branch dev do Neon**; nunca aponte o `.env.local` para a branch principal (produção).

1. No console do Neon, escolha a branch **dev** e clique em **Connect**. Copie as duas URLs:
   - **com pooling** (tem `-pooler` no endereço): vai em `DATABASE_URL`;
   - **sem pooling**: vai em `DATABASE_URL_UNPOOLED`.
2. Crie o arquivo `.env.local` na raiz do projeto, a partir de [.env.example](.env.example). Ele é ignorado pelo git.
3. Rode:

```bash
npm install
npm run db:migrate
npm run dev
```

No primeiro acesso, o app cria o administrador e os dados de demonstração. As contas estão listadas no topo de [server/db/seed.ts](server/db/seed.ts).

Sem SMTP configurado, os e-mails (recuperação de senha, confirmação, convites) ficam em `.data/outbox/` e aparecem em http://localhost:3000/dev/emails. Sem Vercel Blob (`BLOB_STORE_ID` com OIDC ou `BLOB_READ_WRITE_TOKEN`), os arquivos enviados ficam em `.data/uploads/`. As duas pastas ficam fora do Git.

| Comando | O que faz |
| --- | --- |
| `npm run db:migrate` | Aplica as migrações pendentes de `db/migrations` |
| `npm run db:seed` | Grava o administrador e os dados de demonstração, se ainda não existirem |
| `npm run db:reset` | **Apaga tudo** e recria o banco (só funciona com o `.env.local`) |
| `npm run db:backup` | Gera um backup com `pg_dump` fora do repositório (ver a documentação) |
| `npm run db:app-login` | Cria o papel `app_login` (sem privilégios de dono) e grava `DATABASE_APP_URL` no `.env.local` |
| `npm test` | Testes dos corretores, verificação de acesso ao banco e testes de banco |

Os testes de banco rodam na branch dev, num schema temporário que é apagado no fim. Sem `DATABASE_URL_UNPOOLED`, eles são pulados.

## Variáveis de ambiente

Veja [.env.example](.env.example). Para o banco, o código usa `DATABASE_APP_URL` (o app, com o papel `app_login`, pelo pooler; se não existir, usa `DATABASE_URL`) e `DATABASE_URL_UNPOOLED` (migrações, seed, testes e backup). E-mail e arquivos usam `SMTP_*`, `MAIL_FROM` e `BLOB_STORE_ID` (OIDC) ou `BLOB_READ_WRITE_TOKEN`, todos opcionais no desenvolvimento. As variáveis `POSTGRES_*`, `PG*` e `NEON_AUTH_*` criadas pela integração Neon-Vercel não são usadas.

## Segurança, em resumo

- Os dados de cada professor são isolados por Row Level Security no próprio banco. Toda consulta do app roda numa transação com `SET LOCAL ROLE app_user` (um papel sem BYPASSRLS) e o contexto do professor ou do aluno.
- Operações que mexem em várias tabelas (envio, entrega, correção, exclusão de aluno) rodam numa transação só.
- O gabarito nunca vai para o navegador do aluno antes da hora.
- Senhas com scrypt; sessão em cookie assinado.
