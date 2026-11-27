import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app-types.js";
import * as sourcesModel from "../models/sources.model.js";
import { parseBody, validationError } from "../utils/http.js";

const sourceInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.string().trim().max(40).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
const sourcePatch = sourceInput
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update");

export async function listSources(c: Context<AppEnv>) {
  const data = await sourcesModel.listSources(c.get("db"), c.get("userId"));
  return c.json({ data });
}

export async function createSource(c: Context<AppEnv>) {
  const parsed = await parseBody(c, sourceInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const data = await sourcesModel.createSource(c.get("db"), c.get("userId"), parsed.data);
  return c.json({ data }, 201);
}

export async function getSource(c: Context<AppEnv>) {
  const sourceId = c.req.param("sourceId");
  if (!sourceId) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const data = await sourcesModel.getSource(c.get("db"), c.get("userId"), sourceId);
  if (!data) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  return c.json({ data });
}

export async function updateSource(c: Context<AppEnv>) {
  const parsed = await parseBody(c, sourcePatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const sourceId = c.req.param("sourceId");
  if (!sourceId) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const data = await sourcesModel.updateSource(c.get("db"), c.get("userId"), sourceId, parsed.data);
  if (!data) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  return c.json({ data });
}

export async function deleteSource(c: Context<AppEnv>) {
  const sourceId = c.req.param("sourceId");
  if (!sourceId) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const deleted = await sourcesModel.deleteSource(c.get("db"), c.get("userId"), sourceId);
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  return c.body(null, 204);
}
