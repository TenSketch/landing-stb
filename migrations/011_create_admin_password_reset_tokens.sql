-- Admin password reset tokens (referenced by lib/auth.js requestPasswordReset / resetPassword)
CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_email ON admin_password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_token_hash ON admin_password_reset_tokens(token_hash);
