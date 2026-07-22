CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  about_me TEXT NOT NULL DEFAULT '',
  street_address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  birthdate TEXT NOT NULL DEFAULT '',
  current_step INTEGER NOT NULL DEFAULT 2,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_created_at_idx
ON users (created_at);

CREATE TABLE IF NOT EXISTS onboarding_config (
  component_key TEXT PRIMARY KEY,
  page INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO onboarding_config (component_key, page, sort_order)
VALUES
  ('aboutMe', 2, 0),
  ('birthdate', 2, 1),
  ('address', 3, 0)
ON CONFLICT (component_key) DO NOTHING;
