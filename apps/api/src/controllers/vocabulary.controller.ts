import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app-types.js";
import * as vocabularyModel from "../models/vocabulary.model.js";
import { parseBody, validationError } from "../utils/http.js";

const vocabularyInput = z
  .object({
    word: z.string().trim().min(1).max(200),
    sourceId: z.string().uuid().nullable().optional(),
    sectionId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
const vocabularyPatch = z
  .object({
    word: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(["learning", "mastered", "archived"]).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update");

export async function listVocabulary(c: Context<AppEnv>) {
  const statusValue = c.req.query("status");
  const status = statusValue
    ? z.enum(["learning", "mastered", "archived"]).safeParse(statusValue)
    : undefined;
  if (status && !status.success) {
    return validationError(c, "status must be learning, mastered, or archived");
  }
  const data = await vocabularyModel.listVocabulary(c.get("db"), c.get("userId"), {
    sourceId: c.req.query("sourceId"),
    sectionId: c.req.query("sectionId"),
    rootOnly: c.req.query("rootOnly") === "true",
    status: status?.success ? status.data : undefined,
  });
  return c.json({ data });
}

export async function createVocabularyItem(c: Context<AppEnv>) {
  const parsed = await parseBody(c, vocabularyInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const result = await vocabularyModel.createVocabularyItem(
    c.get("db"),
    c.get("userId"),
    parsed.data,
  );
  if ("error" in result) {
    if (result.error === "INVALID_SOURCE") {
      return c.json({ error: { code: "INVALID_SOURCE", message: "Source not found" } }, 400);
    }
    if (result.error === "INVALID_SECTION") {
      return c.json({ error: { code: "INVALID_SECTION", message: "Section not found" } }, 400);
    }
    return c.json(
      {
        error: {
          code: "INVALID_SECTION",
          message: "Section does not belong to the selected source",
        },
      },
      400,
    );
  }
  return c.json({ data: result.item }, 201);
}

export async function getVocabularyItem(c: Context<AppEnv>) {
  const itemId = c.req.param("itemId");
  if (!itemId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  const data = await vocabularyModel.getVocabularyItem(c.get("db"), c.get("userId"), itemId);
  if (!data) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  return c.json({ data });
}

export async function updateVocabularyItem(c: Context<AppEnv>) {
  const parsed = await parseBody(c, vocabularyPatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const itemId = c.req.param("itemId");
  if (!itemId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  const data = await vocabularyModel.updateVocabularyItem(
    c.get("db"),
    c.get("userId"),
    itemId,
    parsed.data,
  );
  if (!data) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  return c.json({ data });
}

export async function deleteVocabularyItem(c: Context<AppEnv>) {
  const itemId = c.req.param("itemId");
  if (!itemId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  const deleted = await vocabularyModel.deleteVocabularyItem(c.get("db"), c.get("userId"), itemId);
  if (!deleted) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  }
  return c.body(null, 204);
}
