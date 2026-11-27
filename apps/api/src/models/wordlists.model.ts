import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { wordlistEntries, wordlistProgress, wordlists } from "../db/schema/wordlists.js";

export type WordlistProgressStatus = "learning" | "mastered" | "ignored";

export async function listWordlists(db: Database) {
  return db
    .select({
      id: wordlists.id,
      slug: wordlists.slug,
      name: wordlists.name,
      description: wordlists.description,
      source_url: wordlists.sourceUrl,
      created_at: wordlists.createdAt,
    })
    .from(wordlists)
    .orderBy(asc(wordlists.name));
}

export async function getWordlist(db: Database, slug: string) {
  const [wordlist] = await db
    .select({ id: wordlists.id })
    .from(wordlists)
    .where(eq(wordlists.slug, slug))
    .limit(1);
  return wordlist ?? null;
}

export async function listWordlistEntries(
  db: Database,
  userId: string,
  wordlistId: string,
  filters: { level?: number; limit: number; offset: number },
) {
  const query = db
    .select({
      id: wordlistEntries.id,
      word: wordlistEntries.word,
      part_of_speech: wordlistEntries.partOfSpeech,
      level: wordlistEntries.level,
      position: wordlistEntries.position,
      progress: wordlistProgress.status,
    })
    .from(wordlistEntries)
    .leftJoin(
      wordlistProgress,
      and(eq(wordlistProgress.entryId, wordlistEntries.id), eq(wordlistProgress.userId, userId)),
    )
    .where(
      filters.level === undefined
        ? eq(wordlistEntries.wordlistId, wordlistId)
        : and(eq(wordlistEntries.wordlistId, wordlistId), eq(wordlistEntries.level, filters.level)),
    )
    .orderBy(asc(wordlistEntries.position))
    .limit(filters.limit)
    .offset(filters.offset);
  return query;
}

export async function setWordlistProgress(
  db: Database,
  userId: string,
  slug: string,
  entryId: string,
  status: WordlistProgressStatus,
): Promise<boolean> {
  const [entry] = await db
    .select({ id: wordlistEntries.id })
    .from(wordlistEntries)
    .innerJoin(wordlists, eq(wordlists.id, wordlistEntries.wordlistId))
    .where(and(eq(wordlists.slug, slug), eq(wordlistEntries.id, entryId)))
    .limit(1);
  if (!entry) return false;

  await db
    .insert(wordlistProgress)
    .values({ userId, entryId, status, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: [wordlistProgress.userId, wordlistProgress.entryId],
      set: { status, updatedAt: Date.now() },
    });
  return true;
}
