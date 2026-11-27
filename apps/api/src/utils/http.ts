import type { Context } from "hono";
import type { z } from "zod";
import type { AppEnv } from "../app-types.js";

export async function parseBody<T extends z.ZodType>(
  c: Context<AppEnv>,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: string }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { error: "Request body must be valid JSON" };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request body" };
  }
  return { data: parsed.data };
}

export function validationError(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: "VALIDATION_ERROR", message } }, 400);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
