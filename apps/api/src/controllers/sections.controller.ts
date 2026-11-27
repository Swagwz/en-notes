import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app-types.js";
import * as sectionsModel from "../models/sections.model.js";
import { parseBody, validationError } from "../utils/http.js";

const sectionInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    position: z.number().int().min(0).nullable().optional(),
  })
  .strict();
const sectionPatch = sectionInput
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update");

export async function listSections(c: Context<AppEnv>) {
  const userId = c.get("userId");
  const sourceId = c.req.param("sourceId");
  if (!sourceId) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const belongsToUser = await sectionsModel.sourceBelongsToUser(c.get("db"), sourceId, userId);
  if (!belongsToUser)
    return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const data = await sectionsModel.listSections(c.get("db"), userId, sourceId);
  return c.json({ data });
}

export async function createSection(c: Context<AppEnv>) {
  const parsed = await parseBody(c, sectionInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const userId = c.get("userId");
  const sourceId = c.req.param("sourceId");
  if (!sourceId) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const belongsToUser = await sectionsModel.sourceBelongsToUser(c.get("db"), sourceId, userId);
  if (!belongsToUser)
    return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const data = await sectionsModel.createSection(c.get("db"), userId, sourceId, parsed.data);
  return c.json({ data }, 201);
}

export async function updateSection(c: Context<AppEnv>) {
  const parsed = await parseBody(c, sectionPatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const sectionId = c.req.param("sectionId");
  if (!sectionId)
    return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  const data = await sectionsModel.updateSection(
    c.get("db"),
    c.get("userId"),
    sectionId,
    parsed.data,
  );
  if (!data) return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  return c.json({ data });
}

export async function deleteSection(c: Context<AppEnv>) {
  const sectionId = c.req.param("sectionId");
  if (!sectionId)
    return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  const deleted = await sectionsModel.deleteSection(c.get("db"), c.get("userId"), sectionId);
  if (!deleted) {
    return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  }
  return c.body(null, 204);
}
