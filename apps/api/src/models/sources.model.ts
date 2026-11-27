import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { sources } from "../db/schema/vocabulary.js";

export async function listSources(db: Database, userId: string) {
  return db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      description: sources.description,
      created_at: sources.createdAt,
      updated_at: sources.updatedAt,
    })
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(desc(sources.createdAt));
}

export async function getSource(db: Database, userId: string, id: string) {
  const [source] = await db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      description: sources.description,
      created_at: sources.createdAt,
      updated_at: sources.updatedAt,
    })
    .from(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, userId)))
    .limit(1);
  return source ?? null;
}

export async function createSource(
  db: Database,
  userId: string,
  input: { name: string; type?: string | null; description?: string | null },
) {
  const now = Date.now();
  const [source] = await db
    .insert(sources)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      type: input.type ?? null,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      description: sources.description,
      created_at: sources.createdAt,
      updated_at: sources.updatedAt,
    });
  return source;
}

export async function updateSource(
  db: Database,
  userId: string,
  id: string,
  input: { name?: string; type?: string | null; description?: string | null },
) {
  const [source] = await db
    .update(sources)
    .set({ ...input, updatedAt: Date.now() })
    .where(and(eq(sources.id, id), eq(sources.userId, userId)))
    .returning({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      description: sources.description,
      created_at: sources.createdAt,
      updated_at: sources.updatedAt,
    });
  return source ?? null;
}

export async function deleteSource(db: Database, userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, userId)))
    .returning({ id: sources.id });
  return deleted.length > 0;
}
