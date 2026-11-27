import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { authUsers } from "./auth.js";

export const wordlists = sqliteTable("wordlists", {
  id: text("id").primaryKey().notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  createdAt: integer("created_at").notNull(),
});

export const wordlistEntries = sqliteTable(
  "wordlist_entries",
  {
    id: text("id").primaryKey().notNull(),
    wordlistId: text("wordlist_id")
      .notNull()
      .references(() => wordlists.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    normalizedWord: text("normalized_word").notNull(),
    partOfSpeech: text("part_of_speech"),
    level: integer("level"),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("wordlist_entries_list_position_idx").on(table.wordlistId, table.position),
    index("wordlist_entries_list_level_idx").on(table.wordlistId, table.level, table.position),
  ],
);

export const wordlistProgress = sqliteTable(
  "wordlist_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => wordlistEntries.id, { onDelete: "cascade" }),
    status: text("status").$type<"learning" | "mastered" | "ignored">().notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.entryId] }),
    check(
      "wordlist_progress_status_check",
      sql`${table.status} in ('learning', 'mastered', 'ignored')`,
    ),
    index("wordlist_progress_user_status_idx").on(table.userId, table.status),
  ],
);
