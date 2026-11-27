import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app-types.js";
import * as wordlistsModel from "../models/wordlists.model.js";
import { parseBody, validationError } from "../utils/http.js";

const progressInput = z
  .object({
    status: z.enum(["learning", "mastered", "ignored"]),
  })
  .strict();

export async function listWordlists(c: Context<AppEnv>) {
  const data = await wordlistsModel.listWordlists(c.get("db"));
  return c.json({ data });
}

export async function listWordlistEntries(c: Context<AppEnv>) {
  const levelParam = c.req.query("level");
  const limit = Number(c.req.query("limit") ?? 100);
  const offset = Number(c.req.query("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return validationError(c, "limit must be an integer between 1 and 500");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return validationError(c, "offset must be a non-negative integer");
  }
  let level: number | undefined;
  if (levelParam !== undefined) {
    level = Number(levelParam);
    if (!Number.isInteger(level) || level < 1) {
      return validationError(c, "level must be a positive integer");
    }
  }

  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: { code: "NOT_FOUND", message: "Wordlist not found" } }, 404);
  const wordlist = await wordlistsModel.getWordlist(c.get("db"), slug);
  if (!wordlist) {
    return c.json({ error: { code: "NOT_FOUND", message: "Wordlist not found" } }, 404);
  }
  const data = await wordlistsModel.listWordlistEntries(c.get("db"), c.get("userId"), wordlist.id, {
    level,
    limit,
    offset,
  });
  return c.json({ data });
}

export async function setWordlistProgress(c: Context<AppEnv>) {
  const parsed = await parseBody(c, progressInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const slug = c.req.param("slug");
  const entryId = c.req.param("entryId");
  if (!slug || !entryId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Wordlist entry not found" } }, 404);
  }
  const found = await wordlistsModel.setWordlistProgress(
    c.get("db"),
    c.get("userId"),
    slug,
    entryId,
    parsed.data.status,
  );
  if (!found) {
    return c.json({ error: { code: "NOT_FOUND", message: "Wordlist entry not found" } }, 404);
  }
  return c.json({ data: { entryId, status: parsed.data.status } });
}
