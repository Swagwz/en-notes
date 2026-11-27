import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { authUsers } from "./auth.js";

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type"),
    description: text("description"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("sources_user_created_idx").on(table.userId, table.createdAt)],
);

export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("sections_source_position_idx").on(table.sourceId, table.position)],
);

export const vocabularyItems = sqliteTable(
  "vocabulary_items",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    word: text("word").notNull(),
    normalizedWord: text("normalized_word").notNull(),
    notes: text("notes"),
    status: text("status")
      .$type<"learning" | "mastered" | "archived">()
      .notNull()
      .default("learning"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "vocabulary_items_status_check",
      sql`${table.status} in ('learning', 'mastered', 'archived')`,
    ),
    index("vocabulary_user_word_idx").on(table.userId, table.normalizedWord),
    index("vocabulary_user_source_idx").on(table.userId, table.sourceId),
    index("vocabulary_user_section_idx").on(table.userId, table.sectionId),
  ],
);
