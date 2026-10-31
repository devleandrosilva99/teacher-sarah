# Relatório: atualização das dependências

Estado em 31/10/2026, branch `atualizar-dependencias`, criada a partir da `main` depois do merge da Fase 2 (`ba971db`). Objetivo: zerar as vulnerabilidades do `npm audit`, começando pela falha crítica do Next.js.

## 1. Resultado do `npm audit`

| | Crítica | Alta | Moderada | Baixa | Total |
| --- | --- | --- | --- | --- | --- |
| Antes | 1 | 9 | 1 | 0 | **11** |
| Depois | 0 | 0 | 0 | 0 | **0** |

### Antes

| Pacote | Gravidade | Direta? | Faixa vulnerável | Origem |
| --- | --- | --- | --- | --- |
| `next` | crítica | sim | 9.3.4-canary.0 a 16.4.0 | Desvio do Proxy no App Router com Turbopack, negação de serviço e outras; a 16.4.1 corrige também duas falhas de execução remota de código (`use cache` com typed arrays e otimização de imagens com SVG) e uma negação de serviço com Server Actions |
| `postcss` | alta | não (via `next`) | até 8.5.22 | XSS na saída do stringify e leitura de arquivos |
| `sharp` | alta | não (via `next`) | até 0.35.5-rc.1 | Falhas herdadas da libvips |
| `zod` | alta | sim | abaixo de 4.6.6 | Esgotamento de memória ao validar coleções muito grandes |
| `@vercel/cli-config` | alta | não | todas | Fixa o `zod` em 4.1.11 |
| `@vercel/oidc` | alta | não | a partir de 3.6.0 | Depende de `@vercel/cli-config` |
| `@vercel/blob` | alta | sim | a partir de 2.4.1 | Depende de `@vercel/oidc` |
| `@vercel/functions` | alta | sim | a partir de 3.6.2 | Depende de `@vercel/oidc` |
| `nanoid` | alta | não | até 3.3.17 | Laço infinito com tamanho negativo |
| `source-map-js` | alta | não | 1.0.0 a 1.2.1 | Negação de serviço com offsets de seção |
| `baseline-browser-mapping` | moderada | não | 2.0.0 a 2.10.x | Encerramento do processo com entrada inválida |

### Depois

```text
found 0 vulnerabilities
```

## 2. O que mudou

| Pacote | Antes | Depois | Como |
| --- | --- | --- | --- |
| `next` | 16.2.6 | **16.4.3** | `package.json`, versão fixa (como antes) |
| `zod` | 4.6.5 (e 4.1.11 dentro da cadeia `@vercel`) | **4.6.7** em todo o projeto | `package.json` (`^4.6.7`) e `overrides` |
| `@vercel/functions` | 3.10.3 | 3.10.5 | `package.json` |
| `@vercel/oidc` | 4.0.3 | 4.0.5 (o do `@vercel/blob` segue 3.8.10) | junto com `@vercel/functions` |
| `postcss` | 8.5.14 (e 8.4.31 do `next`) | 8.5.23 | junto com o `next` e `npm audit fix` |
| `sharp` | 0.34.5 | 0.35.5 | junto com o `next` |
| `nanoid` | 3.3.12 | 3.3.20 | `npm audit fix` |
| `source-map-js` | 1.2.1 | 1.2.2 | `npm audit fix` |
| `baseline-browser-mapping` | 2.10.29 | 2.11.34 | `npm audit fix` |

**Sobre o `zod` da cadeia `@vercel`:** o `@vercel/cli-config` (usado pelo `@vercel/oidc`, que o `@vercel/blob` e o `@vercel/functions` usam) fixa o `zod` em exatamente 4.1.11, até na versão mais recente (0.3.5, de 29/10/2026). A "correção" que o `npm audit fix --force` sugeria era *rebaixar* o `@vercel/blob` para 2.4.0 e o `@vercel/functions` para 3.6.1, o que tiraria o suporte a OIDC e às URLs assinadas. Em vez disso, o `package.json` ganhou um `overrides` que força o `zod` 4.6.7 só nesse pacote. É a mesma versão maior (4.x), e a diferença é a correção de segurança. Quando o `@vercel/cli-config` atualizar a dependência, o `overrides` pode sair.

**Não mudou:** React (19.2.4), `pg`, `nodemailer` (10.1.7, já corrigido), `@vercel/blob` (2.8.2, a versão estável mais recente) e as dependências de desenvolvimento, que não tinham alertas.

## 3. Notas de versão lidas (Next.js 16.3 e 16.4)

- **16.3:** o runtime `edge` passa a ser obsoleto; avisos para opções antigas de TypeScript (`baseUrl`, `moduleResolution: "node"`); `experimental.useCache` e `experimental.dynamicIO` marcados como obsoletos. O projeto não usa nenhum deles.
- **16.4:** remove a opção experimental `appNewScrollHandler`; o Pages Router deixa de dar suporte ao React 18; Server Actions desconhecidas passam a responder erro ao cliente; correções em Server Actions com PPR e em `revalidateTag`/`after()`. Nada disso exige mudança no código: o app usa só o App Router, React 19, `proxy.ts` e `after()` para enviar e-mails, que continuam funcionando.
- **16.4.1 a 16.4.3:** correções de segurança (as da tabela acima) e de estabilidade.

Por isso, nenhum arquivo de código precisou mudar; só `package.json` e `package-lock.json`.

## 4. Verificação

- `tsc --noEmit`: sem erros.
- `npm test`: 83 testes passando (19 sem banco e 64 de banco, na branch dev).
- `next build` (Next.js 16.4.3, Turbopack): sem erros e sem avisos.
- No navegador, com o servidor local na branch dev e o banco acessado como `app_login`:
  - login dos três perfis: admin (painel mostra "conectado como app_login"), professora e aluno;
  - criar questão: uma questão "Entrega de arquivo" com imagem enviada pelo botão "Enviar arquivo";
  - montar a atividade com essa questão e enviar ao aluno;
  - aluno faz a atividade: vê a imagem do professor (200) e anexa uma foto, que foi reduzida no navegador de 2000×1500 px (PNG) para 1600×1200 px (WebP de 40 KB); entrega;
  - correção: a professora baixa o arquivo (200, `image/webp`, 1600×1200), dá a nota (1/1) e o comentário, e a correção é salva;
  - nenhum erro no log do servidor.
- Os dados criados para o teste (questão, atividade, envio, entrega, arquivos e notificações) foram apagados da branch dev no fim.

## 5. Depois do merge

- Conferir o deploy de produção na Vercel e repetir rapidamente: entrar, abrir uma atividade e baixar um arquivo.
- Rodar `npm audit` de tempos em tempos (ou ativar o Dependabot no GitHub), e revisar o `overrides` do `zod` quando o `@vercel/cli-config` sair com uma versão nova.
