ALTER TABLE dictionary_entries RENAME TO dictionary_lookups;

CREATE TABLE dictionary_entries (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  lookup_term TEXT NOT NULL,
  entry_key TEXT NOT NULL,
  headword TEXT NOT NULL,
  part_of_speech TEXT,
  pronunciation TEXT,
  audio_filename TEXT,
  short_definitions_json TEXT NOT NULL,
  entry_json TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(provider, lookup_term, position)
);

CREATE INDEX dictionary_entries_headword_idx ON dictionary_entries(headword);
