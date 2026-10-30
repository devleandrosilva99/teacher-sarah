-- 0003_auth_email: recuperação de senha, verificação de e-mail e limites.
--
-- Tabelas globais (sem teacher_id, como users): são usadas antes do login,
-- localizadas pelo hash do token ou pela chave do limite.
--
-- Compatível com o código anterior: só acrescenta colunas e tabelas. A tabela
-- login_attempts deixa de ser usada (o limite de login passa para rate_limits)
-- e pode ser removida numa migração futura, depois que esta versão estiver no ar.

-- Contas já existentes contam como verificadas (o admin e os alunos entraram
-- por e-mail/convite; professores antigos já estavam usando o sistema).
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
UPDATE users SET email_verified_at = created_at;

-- Versão da sessão: trocar ou redefinir a senha incrementa e derruba as
-- sessões abertas (o cookie guarda a versão em que foi criado).
ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 1;

-- Token de uso único. Só o SHA-256 fica no banco; o token em si vai no link.
CREATE TABLE auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('password_reset', 'email_verify')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id, purpose) WHERE used_at IS NULL;

-- Limite por janela fixa: login por e-mail, pedidos de redefinição por e-mail
-- e por IP, reenvio de verificação. Uma linha por chave.
CREATE TABLE rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL
);

-- Já coberto pelos privilégios padrão da 0001; explícito por clareza.
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_tokens, rate_limits TO app_user;
