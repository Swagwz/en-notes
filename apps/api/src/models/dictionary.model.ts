import { and, eq } from "drizzle-orm";
import type {
  CleanWordEntry,
  WebsterLearnersDictionaryEntry,
} from "../adapters/webster-learners.adapter.js";
import type { Database } from "../db/index.js";
import { dictionaryEntries, dictionaryLookups } from "../db/schema/dictionary.js";

const WEBSTER_PROVIDER = "webster-learners";

export async function getCachedLookup(db: Database, term: string) {
  const [cached] = await db
    .select({
      responseJson: dictionaryLookups.responseJson,
      normalizedJson: dictionaryLookups.normalizedJson,
    })
    .from(dictionaryLookups)
    .where(
      and(
        eq(dictionaryLookups.provider, WEBSTER_PROVIDER),
        eq(dictionaryLookups.term, term),
      ),
    )
    .limit(1);
  return cached ?? null;
}

export async function saveNormalizedLookup(
  db: Database,
  term: string,
  cleanEntries: CleanWordEntry[],
) {
  await db
    .update(dictionaryLookups)
    .set({ normalizedJson: JSON.stringify(cleanEntries) })
    .where(
      and(
        eq(dictionaryLookups.provider, WEBSTER_PROVIDER),
        eq(dictionaryLookups.term, term),
      ),
    );
}

export async function saveLookup(
  db: Database,
  term: string,
  response: unknown,
  cleanEntries: CleanWordEntry[],
  dictionaryEntryRows: WebsterLearnersDictionaryEntry[],
  now: number,
) {
  const responseJson = JSON.stringify(response);
  const normalizedJson = JSON.stringify(cleanEntries);
  const entries = dictionaryEntryRows.map((entry) => ({
    id: crypto.randomUUID(),
    provider: WEBSTER_PROVIDER,
    lookupTerm: term,
    ...entry,
  }));

  const upsertLookup = db
    .insert(dictionaryLookups)
    .values({
      id: crypto.randomUUID(),
      provider: WEBSTER_PROVIDER,
      term,
      responseJson,
      normalizedJson,
      fetchedAt: now,
    })
    .onConflictDoUpdate({
      target: [dictionaryLookups.provider, dictionaryLookups.term],
      set: {
        responseJson,
        normalizedJson,
        fetchedAt: now,
      },
    });
  const removeOldEntries = db
    .delete(dictionaryEntries)
    .where(
      and(eq(dictionaryEntries.provider, WEBSTER_PROVIDER), eq(dictionaryEntries.lookupTerm, term)),
    );
  const insertEntries = entries.length ? db.insert(dictionaryEntries).values(entries) : null;

  if (insertEntries) {
    await db.batch([upsertLookup, removeOldEntries, insertEntries]);
  } else {
    await db.batch([upsertLookup, removeOldEntries]);
  }
}
