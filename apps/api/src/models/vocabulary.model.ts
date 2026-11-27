import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { sections, sources, vocabularyItems } from "../db/schema/vocabulary.js";

export type VocabularyStatus = "learning" | "mastered" | "archived";

export async function listVocabulary(
  db: Database,
  userId: string,
  filters: {
    sourceId?: string;
    sectionId?: string;
    rootOnly?: boolean;
    status?: VocabularyStatus;
  },
) {
  const conditions = [eq(vocabularyItems.userId, userId)];
  if (filters.sourceId) conditions.push(eq(vocabularyItems.sourceId, filters.sourceId));
  if (filters.sectionId) conditions.push(eq(vocabularyItems.sectionId, filters.sectionId));
  if (filters.rootOnly) conditions.push(isNull(vocabularyItems.sectionId));
  if (filters.status) conditions.push(eq(vocabularyItems.status, filters.status));

  return db
    .select({
      id: vocabularyItems.id,
      source_id: vocabularyItems.sourceId,
      section_id: vocabularyItems.sectionId,
      word: vocabularyItems.word,
      notes: vocabularyItems.notes,
      status: vocabularyItems.status,
      created_at: vocabularyItems.createdAt,
      updated_at: vocabularyItems.updatedAt,
    })
    .from(vocabularyItems)
    .where(and(...conditions))
    .orderBy(desc(vocabularyItems.createdAt));
}

export async function getVocabularyItem(db: Database, userId: string, id: string) {
  const [item] = await db
    .select({
      id: vocabularyItems.id,
      source_id: vocabularyItems.sourceId,
      section_id: vocabularyItems.sectionId,
      word: vocabularyItems.word,
      notes: vocabularyItems.notes,
      status: vocabularyItems.status,
      created_at: vocabularyItems.createdAt,
      updated_at: vocabularyItems.updatedAt,
    })
    .from(vocabularyItems)
    .where(and(eq(vocabularyItems.id, id), eq(vocabularyItems.userId, userId)))
    .limit(1);
  return item ?? null;
}

export async function createVocabularyItem(
  db: Database,
  userId: string,
  input: {
    word: string;
    sourceId?: string | null;
    sectionId?: string | null;
    notes?: string | null;
  },
) {
  let sourceId = input.sourceId ?? null;
  if (sourceId) {
    const [source] = await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
      .limit(1);
    if (!source) return { error: "INVALID_SOURCE" as const };
  }

  if (input.sectionId) {
    const [section] = await db
      .select({ id: sections.id, sourceId: sections.sourceId })
      .from(sections)
      .where(and(eq(sections.id, input.sectionId), eq(sections.userId, userId)))
      .limit(1);
    if (!section) return { error: "INVALID_SECTION" as const };
    if (sourceId && section.sourceId !== sourceId) {
      return { error: "SECTION_SOURCE_MISMATCH" as const };
    }
    sourceId = section.sourceId;
  }

  const now = Date.now();
  const [item] = await db
    .insert(vocabularyItems)
    .values({
      id: crypto.randomUUID(),
      userId,
      sourceId,
      sectionId: input.sectionId ?? null,
      word: input.word,
      normalizedWord: input.word.toLocaleLowerCase(),
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: vocabularyItems.id,
      source_id: vocabularyItems.sourceId,
      section_id: vocabularyItems.sectionId,
      word: vocabularyItems.word,
      notes: vocabularyItems.notes,
      status: vocabularyItems.status,
      created_at: vocabularyItems.createdAt,
      updated_at: vocabularyItems.updatedAt,
    });
  return { item };
}

export async function updateVocabularyItem(
  db: Database,
  userId: string,
  id: string,
  input: { word?: string; notes?: string | null; status?: VocabularyStatus },
) {
  const values = {
    ...input,
    ...(input.word ? { normalizedWord: input.word.toLocaleLowerCase() } : {}),
    updatedAt: Date.now(),
  };
  const [item] = await db
    .update(vocabularyItems)
    .set(values)
    .where(and(eq(vocabularyItems.id, id), eq(vocabularyItems.userId, userId)))
    .returning({
      id: vocabularyItems.id,
      source_id: vocabularyItems.sourceId,
      section_id: vocabularyItems.sectionId,
      word: vocabularyItems.word,
      notes: vocabularyItems.notes,
      status: vocabularyItems.status,
      created_at: vocabularyItems.createdAt,
      updated_at: vocabularyItems.updatedAt,
    });
  return item ?? null;
}

export async function deleteVocabularyItem(
  db: Database,
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(vocabularyItems)
    .where(and(eq(vocabularyItems.id, id), eq(vocabularyItems.userId, userId)))
    .returning({ id: vocabularyItems.id });
  return deleted.length > 0;
}
