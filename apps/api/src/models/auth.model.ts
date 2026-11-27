import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Database } from "../db/index.js";
import { authAccounts, authUsers, systemState } from "../db/schema/auth.js";

export async function hasUsers(db: Database): Promise<boolean> {
  const [user] = await db.select({ id: authUsers.id }).from(authUsers).limit(1);
  return user !== undefined;
}

export async function createInitialAdmin(
  db: Database,
  input: { id: string; name: string; email: string; password: string; now: number },
) {
  const passwordHash = await hashPassword(input.password);
  await db.batch([
    db.insert(authUsers).values({
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      createdAt: input.now,
      updatedAt: input.now,
      role: "admin",
      banned: false,
    }),
    db.insert(authAccounts).values({
      id: crypto.randomUUID(),
      accountId: input.id,
      providerId: "credential",
      userId: input.id,
      password: passwordHash,
      createdAt: input.now,
      updatedAt: input.now,
    }),
    db
      .insert(systemState)
      .values({ key: "bootstrap_admin", completedAt: input.now })
      .onConflictDoNothing(),
  ]);
}

export async function hasUserWithEmail(db: Database, email: string): Promise<boolean> {
  const [user] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);
  return user !== undefined;
}
