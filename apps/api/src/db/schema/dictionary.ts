import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const dictionaryLookups = sqliteTable(
  "dictionary_lookups",
  {
    id: text("id").primaryKey().notNull(),
    provider: text("provider").notNull(),
    term: text("term").notNull(),
    responseJson: text("response_json").notNull(),
    normalizedJson: text("normalized_json"),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [uniqueIndex("dictionary_lookups_provider_term_idx").on(table.provider, table.term)],
);

export const dictionaryEntries = sqliteTable(
  "dictionary_entries",
  {
    id: text("id").primaryKey().notNull(),
    provider: text("provider").notNull(),
    lookupTerm: text("lookup_term").notNull(),
    entryKey: text("entry_key").notNull(),
    headword: text("headword").notNull(),
    partOfSpeech: text("part_of_speech"),
    pronunciation: text("pronunciation"),
    audioFilename: text("audio_filename"),
    shortDefinitionsJson: text("short_definitions_json").notNull(),
    entryJson: text("entry_json").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("dictionary_entries_lookup_position_idx").on(
      table.provider,
      table.lookupTerm,
      table.position,
    ),
    index("dictionary_entries_headword_idx").on(table.headword),
  ],
);
