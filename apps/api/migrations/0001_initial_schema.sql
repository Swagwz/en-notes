CREATE TABLE auth_users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  banned INTEGER NOT NULL DEFAULT 0,
  banReason TEXT,
  banExpires INTEGER
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  impersonatedBy TEXT
);

CREATE INDEX auth_sessions_userId_idx ON auth_sessions(userId);

CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX auth_accounts_userId_idx ON auth_accounts(userId);

CREATE TABLE auth_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE INDEX auth_verifications_identifier_idx ON auth_verifications(identifier);

CREATE TABLE sources (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX sources_user_created_idx ON sources(user_id, created_at);

CREATE TABLE sections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX sections_source_position_idx ON sections(source_id, position);

CREATE TABLE vocabulary_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'learning'
    CHECK (status IN ('learning', 'mastered', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX vocabulary_user_word_idx ON vocabulary_items(user_id, normalized_word);
CREATE INDEX vocabulary_user_source_idx ON vocabulary_items(user_id, source_id);
CREATE INDEX vocabulary_user_section_idx ON vocabulary_items(user_id, section_id);

CREATE TABLE dictionary_entries (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  term TEXT NOT NULL,
  response_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(provider, term)
);

CREATE TABLE wordlists (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE wordlist_entries (
  id TEXT PRIMARY KEY NOT NULL,
  wordlist_id TEXT NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  part_of_speech TEXT,
  level INTEGER,
  position INTEGER NOT NULL,
  UNIQUE(wordlist_id, position)
);

CREATE INDEX wordlist_entries_list_level_idx ON wordlist_entries(wordlist_id, level, position);

CREATE TABLE wordlist_progress (
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES wordlist_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('learning', 'mastered', 'ignored')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, entry_id)
);

CREATE TABLE system_state (
  key TEXT PRIMARY KEY NOT NULL,
  completed_at INTEGER
);
