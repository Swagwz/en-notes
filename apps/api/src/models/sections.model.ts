import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { sections, sources } from "../db/schema/vocabulary.js";

export async function sourceBelongsToUser(
  db: Database,
  sourceId: string,
  userId: string,
): Promise<boolean> {
  const [source] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .limit(1);
  return source !== undefined;
}

export async function listSections(db: Database, userId: string, sourceId: string) {
  return db
    .select({
      id: sections.id,
      source_id: sections.sourceId,
      name: sections.name,
      description: sections.description,
      position: sections.position,
      created_at: sections.createdAt,
      updated_at: sections.updatedAt,
    })
    .from(sections)
    .where(and(eq(sections.sourceId, sourceId), eq(sections.userId, userId)))
    .orderBy(asc(sections.position), asc(sections.createdAt));
}

export async function createSection(
  db: Database,
  userId: string,
  sourceId: string,
  input: { name: string; description?: string | null; position?: number | null },
) {
  const now = Date.now();
  const [section] = await db
    .insert(sections)
    .values({
      id: crypto.randomUUID(),
      userId,
      sourceId,
      name: input.name,
      description: input.description ?? null,
      position: input.position ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: sections.id,
      source_id: sections.sourceId,
      name: sections.name,
      description: sections.description,
      position: sections.position,
      created_at: sections.createdAt,
      updated_at: sections.updatedAt,
    });
  return section;
}

export async function updateSection(
  db: Database,
  userId: string,
  id: string,
  input: { name?: string; description?: string | null; position?: number | null },
) {
  const [section] = await db
    .update(sections)
    .set({ ...input, updatedAt: Date.now() })
    .where(and(eq(sections.id, id), eq(sections.userId, userId)))
    .returning({
      id: sections.id,
      source_id: sections.sourceId,
      name: sections.name,
      description: sections.description,
      position: sections.position,
      created_at: sections.createdAt,
      updated_at: sections.updatedAt,
    });
  return section ?? null;
}

export async function deleteSection(db: Database, userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(sections)
    .where(and(eq(sections.id, id), eq(sections.userId, userId)))
    .returning({ id: sections.id });
  return deleted.length > 0;
}
