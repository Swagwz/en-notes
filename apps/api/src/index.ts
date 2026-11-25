import { swaggerUI } from "@hono/swagger-ui";
import { hashPassword } from "better-auth/crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { createAuth } from "./auth.js";
import type { Env } from "./env.js";

type AppEnv = { Bindings: Env; Variables: { userId: string } };
type Source = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
};
type Section = {
  id: string;
  source_id: string;
  name: string;
  description: string | null;
  position: number | null;
  created_at: number;
  updated_at: number;
};
type VocabularyItem = {
  id: string;
  source_id: string | null;
  section_id: string | null;
  word: string;
  notes: string | null;
  status: "learning" | "mastered" | "archived";
  created_at: number;
  updated_at: number;
};

const app = new Hono<AppEnv>();
const api = new Hono<AppEnv>();

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
const bootstrapInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    password: z.string().min(12).max(128),
  })
  .strict();
const createUserInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();
const progressInput = z
  .object({
    status: z.enum(["learning", "mastered", "ignored"]),
  })
  .strict();

async function parseBody<T extends z.ZodType>(
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request body" };
  return { data: parsed.data };
}

function validationError(c: Context<AppEnv>, message: string) {
  return c.json({ error: { code: "VALIDATION_ERROR", message } }, 400);
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function authRequestHeaders(c: Context<AppEnv>): Headers {
  const headers = new Headers(c.req.raw.headers);
  if (!headers.has("origin")) headers.set("origin", c.env.BETTER_AUTH_URL);
  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function forwardAuth(
  c: Context<AppEnv>,
  endpoint: string,
  method: "POST",
  includeBody: boolean,
) {
  const url = new URL(c.req.url);
  url.pathname = `/api/v1/auth${endpoint}`;
  url.search = "";
  const body = includeBody ? await c.req.raw.arrayBuffer() : undefined;
  const request = new Request(url, {
    method,
    headers: authRequestHeaders(c),
    body,
  });
  const response = await createAuth(c.env).handler(request);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "EN Notes API",
    version: "1.0.0",
    description:
      "Private vocabulary API. Protected endpoints require the Better Auth session cookie.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Authentication" },
    { name: "Sources" },
    { name: "Sections" },
    { name: "Vocabulary" },
    { name: "Dictionary" },
    { name: "Wordlists" },
  ],
  paths: {
    "/api/v1/bootstrap": {
      post: {
        tags: ["Authentication"],
        summary: "Create the first administrator",
        description:
          "One-time setup. Requires the configured bootstrap secret and an empty users table.",
        parameters: [
          { in: "header", name: "X-Bootstrap-Secret", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "password"],
                properties: {
                  name: { type: "string" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Administrator created" },
          "403": { description: "Invalid bootstrap secret" },
          "409": { description: "Bootstrap already completed" },
        },
      },
    },
    "/api/v1/sessions": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Session created; session cookie is set" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/sessions/current": {
      get: {
        tags: ["Authentication"],
        summary: "Get the current session",
        responses: {
          "200": { description: "Current session" },
          "401": { description: "Not authenticated" },
        },
      },
      delete: {
        tags: ["Authentication"],
        summary: "Sign out",
        responses: { "200": { description: "Session ended" } },
      },
    },
    "/api/v1/users": {
      post: {
        tags: ["Authentication"],
        summary: "Invite a user",
        description: "Administrator only. Public sign-up is disabled.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "User created" },
          "401": { description: "Not authenticated" },
          "403": { description: "Administrator role required" },
        },
      },
    },
    "/api/v1/sources": {
      get: {
        tags: ["Sources"],
        summary: "List sources",
        responses: { "200": { description: "User's sources" } },
      },
      post: {
        tags: ["Sources"],
        summary: "Create a source",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SourceInput" } } },
        },
        responses: { "201": { description: "Source created" } },
      },
    },
    "/api/v1/sources/{sourceId}": {
      get: {
        tags: ["Sources"],
        summary: "Get a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "200": { description: "Source" }, "404": { description: "Source not found" } },
      },
      patch: {
        tags: ["Sources"],
        summary: "Update a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SourcePatch" } } },
        },
        responses: { "200": { description: "Source updated" } },
      },
      delete: {
        tags: ["Sources"],
        summary: "Delete a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "204": { description: "Source deleted" } },
      },
    },
    "/api/v1/sources/{sourceId}/sections": {
      get: {
        tags: ["Sections"],
        summary: "List sections in a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "200": { description: "Source sections" } },
      },
      post: {
        tags: ["Sections"],
        summary: "Create a section",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SectionInput" } },
          },
        },
        responses: { "201": { description: "Section created" } },
      },
    },
    "/api/v1/sections/{sectionId}": {
      patch: {
        tags: ["Sections"],
        summary: "Update a section",
        parameters: [{ $ref: "#/components/parameters/sectionId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SectionPatch" } },
          },
        },
        responses: { "200": { description: "Section updated" } },
      },
      delete: {
        tags: ["Sections"],
        summary: "Delete a section",
        parameters: [{ $ref: "#/components/parameters/sectionId" }],
        responses: { "204": { description: "Section deleted" } },
      },
    },
    "/api/v1/vocabulary": {
      get: {
        tags: ["Vocabulary"],
        summary: "List vocabulary items",
        parameters: [
          { in: "query", name: "sourceId", schema: { type: "string", format: "uuid" } },
          { in: "query", name: "sectionId", schema: { type: "string", format: "uuid" } },
          { in: "query", name: "rootOnly", schema: { type: "boolean" } },
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["learning", "mastered", "archived"] },
          },
        ],
        responses: { "200": { description: "Vocabulary items" } },
      },
      post: {
        tags: ["Vocabulary"],
        summary: "Add a vocabulary item",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VocabularyInput" } },
          },
        },
        responses: { "201": { description: "Vocabulary item created" } },
      },
    },
    "/api/v1/vocabulary/{itemId}": {
      get: {
        tags: ["Vocabulary"],
        summary: "Get a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        responses: {
          "200": { description: "Vocabulary item" },
          "404": { description: "Item not found" },
        },
      },
      patch: {
        tags: ["Vocabulary"],
        summary: "Update a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VocabularyPatch" } },
          },
        },
        responses: { "200": { description: "Vocabulary item updated" } },
      },
      delete: {
        tags: ["Vocabulary"],
        summary: "Delete a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        responses: { "204": { description: "Vocabulary item deleted" } },
      },
    },
    "/api/v1/dictionary/entries": {
      get: {
        tags: ["Dictionary"],
        summary: "Look up a term in Webster's Learner's Dictionary",
        parameters: [
          { in: "query", name: "term", required: true, schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": { description: "Raw dictionary response, cached in D1" },
          "503": { description: "Dictionary API key is not configured" },
          "502": { description: "Dictionary provider request failed" },
        },
      },
    },
    "/api/v1/wordlists": {
      get: {
        tags: ["Wordlists"],
        summary: "List available wordlists",
        responses: { "200": { description: "Wordlists" } },
      },
    },
    "/api/v1/wordlists/{slug}/entries": {
      get: {
        tags: ["Wordlists"],
        summary: "List entries in a wordlist",
        parameters: [
          { in: "path", name: "slug", required: true, schema: { type: "string" } },
          { in: "query", name: "level", schema: { type: "integer" } },
          { in: "query", name: "limit", schema: { type: "integer", default: 100, maximum: 500 } },
          { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": { description: "Wordlist entries with current user's progress" },
          "404": { description: "Wordlist not found" },
        },
      },
    },
    "/api/v1/wordlists/{slug}/entries/{entryId}/progress": {
      put: {
        tags: ["Wordlists"],
        summary: "Set wordlist entry progress",
        parameters: [
          { in: "path", name: "slug", required: true, schema: { type: "string" } },
          {
            in: "path",
            name: "entryId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["learning", "mastered", "ignored"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Progress saved" },
          "404": { description: "Wordlist entry not found" },
        },
      },
    },
  },
  components: {
    parameters: {
      sourceId: {
        in: "path",
        name: "sourceId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      sectionId: {
        in: "path",
        name: "sectionId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      itemId: {
        in: "path",
        name: "itemId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      SourceInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", maxLength: 120 },
          type: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
      SourcePatch: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", maxLength: 120 },
          type: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
      SectionInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", maxLength: 120 },
          description: { type: ["string", "null"] },
          position: { type: ["integer", "null"], minimum: 0 },
        },
      },
      SectionPatch: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", maxLength: 120 },
          description: { type: ["string", "null"] },
          position: { type: ["integer", "null"], minimum: 0 },
        },
      },
      VocabularyInput: {
        type: "object",
        required: ["word"],
        properties: {
          word: { type: "string", maxLength: 200 },
          sourceId: { type: ["string", "null"], format: "uuid" },
          sectionId: { type: ["string", "null"], format: "uuid" },
          notes: { type: ["string", "null"] },
        },
      },
      VocabularyPatch: {
        type: "object",
        properties: {
          word: { type: "string", maxLength: 200 },
          notes: { type: ["string", "null"] },
          status: { type: "string", enum: ["learning", "mastered", "archived"] },
        },
      },
    },
  },
};

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/v1/openapi.json", (c) => c.json(openApiDocument));
app.get("/api/v1/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

app.post("/api/v1/bootstrap", async (c) => {
  const configuredSecret = c.env.BOOTSTRAP_SECRET;
  const adminEmail = c.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredSecret || !adminEmail) {
    return c.json(
      {
        error: {
          code: "BOOTSTRAP_NOT_CONFIGURED",
          message: "Initial administrator setup is not configured",
        },
      },
      503,
    );
  }

  const existingUser = await c.env.DB.prepare("SELECT id FROM auth_users LIMIT 1").first();
  if (existingUser)
    return c.json(
      {
        error: {
          code: "BOOTSTRAP_COMPLETED",
          message: "Bootstrap is only available before the first user is created",
        },
      },
      409,
    );

  const suppliedSecret = c.req.header("X-Bootstrap-Secret") ?? "";
  if (!constantTimeEqual(suppliedSecret, configuredSecret)) {
    return c.json(
      { error: { code: "INVALID_BOOTSTRAP_SECRET", message: "Bootstrap secret is invalid" } },
      403,
    );
  }

  const parsed = await parseBody(c, bootstrapInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const userId = crypto.randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(parsed.data.password);
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO system_state (key, completed_at) SELECT 'bootstrap_admin', NULL WHERE NOT EXISTS (SELECT 1 FROM auth_users) ON CONFLICT(key) DO NOTHING",
    ),
    c.env.DB.prepare(
      "INSERT INTO auth_users (id, name, email, emailVerified, createdAt, updatedAt, role, banned) SELECT ?, ?, ?, 1, ?, ?, 'admin', 0 WHERE EXISTS (SELECT 1 FROM system_state WHERE key = 'bootstrap_admin' AND completed_at IS NULL) AND NOT EXISTS (SELECT 1 FROM auth_users)",
    ).bind(userId, parsed.data.name, adminEmail, now, now),
    c.env.DB.prepare(
      "INSERT INTO auth_accounts (id, accountId, providerId, userId, password, createdAt, updatedAt) SELECT ?, ?, 'credential', ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM auth_users WHERE id = ?)",
    ).bind(crypto.randomUUID(), userId, userId, passwordHash, now, now, userId),
    c.env.DB.prepare(
      "UPDATE system_state SET completed_at = ? WHERE key = 'bootstrap_admin' AND completed_at IS NULL AND EXISTS (SELECT 1 FROM auth_users WHERE id = ?)",
    ).bind(now, userId),
  ]);
  if (results[1]?.meta.changes !== 1) {
    return c.json(
      {
        error: {
          code: "BOOTSTRAP_COMPLETED",
          message: "Bootstrap is only available before the first user is created",
        },
      },
      409,
    );
  }
  return c.json(
    { data: { id: userId, name: parsed.data.name, email: adminEmail, role: "admin" } },
    201,
  );
});

app.post("/api/v1/sessions", (c) => forwardAuth(c, "/sign-in/email", "POST", true));
app.get("/api/v1/sessions/current", async (c) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session)
    return c.json({ error: { code: "UNAUTHENTICATED", message: "Sign in is required" } }, 401);
  return c.json({ data: session });
});
app.delete("/api/v1/sessions/current", (c) => forwardAuth(c, "/sign-out", "POST", false));

api.use("*", async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session)
    return c.json({ error: { code: "UNAUTHENTICATED", message: "Sign in is required" } }, 401);
  c.set("userId", session.user.id);
  await next();
});

api.post("/users", async (c) => {
  const parsed = await parseBody(c, createUserInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const request = new Request(new URL("/api/v1/auth/admin/create-user", c.req.url), {
    method: "POST",
    headers: authRequestHeaders(c),
    body: JSON.stringify({ ...parsed.data, role: "user" }),
  });
  const response = await createAuth(c.env).handler(request);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});

api.get("/sources", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT id, name, type, description, created_at, updated_at FROM sources WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(c.get("userId"))
    .all<Source>();
  return c.json({ data: result.results });
});

api.post("/sources", async (c) => {
  const parsed = await parseBody(c, sourceInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO sources (id, user_id, name, type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      c.get("userId"),
      parsed.data.name,
      parsed.data.type ?? null,
      parsed.data.description ?? null,
      now,
      now,
    )
    .run();
  const source = await c.env.DB.prepare(
    "SELECT id, name, type, description, created_at, updated_at FROM sources WHERE id = ? AND user_id = ?",
  )
    .bind(id, c.get("userId"))
    .first<Source>();
  return c.json({ data: source }, 201);
});

api.get("/sources/:sourceId", async (c) => {
  const source = await c.env.DB.prepare(
    "SELECT id, name, type, description, created_at, updated_at FROM sources WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("sourceId"), c.get("userId"))
    .first<Source>();
  if (!source) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  return c.json({ data: source });
});

api.patch("/sources/:sourceId", async (c) => {
  const parsed = await parseBody(c, sourcePatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const current = await c.env.DB.prepare(
    "SELECT id, name, type, description FROM sources WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("sourceId"), c.get("userId"))
    .first<Pick<Source, "id" | "name" | "type" | "description">>();
  if (!current) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const name = parsed.data.name ?? current.name;
  const type = parsed.data.type === undefined ? current.type : parsed.data.type;
  const description =
    parsed.data.description === undefined ? current.description : parsed.data.description;
  const now = Date.now();
  const result = await c.env.DB.prepare(
    "UPDATE sources SET name = ?, type = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  )
    .bind(name, type, description, now, c.req.param("sourceId"), c.get("userId"))
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const source = await c.env.DB.prepare(
    "SELECT id, name, type, description, created_at, updated_at FROM sources WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("sourceId"), c.get("userId"))
    .first<Source>();
  return c.json({ data: source });
});

api.delete("/sources/:sourceId", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM sources WHERE id = ? AND user_id = ?")
    .bind(c.req.param("sourceId"), c.get("userId"))
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  return c.body(null, 204);
});

api.get("/sources/:sourceId/sections", async (c) => {
  const source = await c.env.DB.prepare("SELECT id FROM sources WHERE id = ? AND user_id = ?")
    .bind(c.req.param("sourceId"), c.get("userId"))
    .first();
  if (!source) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const result = await c.env.DB.prepare(
    "SELECT id, source_id, name, description, position, created_at, updated_at FROM sections WHERE source_id = ? AND user_id = ? ORDER BY position, created_at",
  )
    .bind(c.req.param("sourceId"), c.get("userId"))
    .all<Section>();
  return c.json({ data: result.results });
});

api.post("/sources/:sourceId/sections", async (c) => {
  const parsed = await parseBody(c, sectionInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const source = await c.env.DB.prepare("SELECT id FROM sources WHERE id = ? AND user_id = ?")
    .bind(c.req.param("sourceId"), c.get("userId"))
    .first();
  if (!source) return c.json({ error: { code: "NOT_FOUND", message: "Source not found" } }, 404);
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO sections (id, user_id, source_id, name, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      c.get("userId"),
      c.req.param("sourceId"),
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.position ?? null,
      now,
      now,
    )
    .run();
  const section = await c.env.DB.prepare(
    "SELECT id, source_id, name, description, position, created_at, updated_at FROM sections WHERE id = ? AND user_id = ?",
  )
    .bind(id, c.get("userId"))
    .first<Section>();
  return c.json({ data: section }, 201);
});

api.patch("/sections/:sectionId", async (c) => {
  const parsed = await parseBody(c, sectionPatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const current = await c.env.DB.prepare(
    "SELECT id, name, description, position FROM sections WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("sectionId"), c.get("userId"))
    .first<Pick<Section, "id" | "name" | "description" | "position">>();
  if (!current) return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  const name = parsed.data.name ?? current.name;
  const description =
    parsed.data.description === undefined ? current.description : parsed.data.description;
  const position = parsed.data.position === undefined ? current.position : parsed.data.position;
  const result = await c.env.DB.prepare(
    "UPDATE sections SET name = ?, description = ?, position = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  )
    .bind(name, description, position, Date.now(), c.req.param("sectionId"), c.get("userId"))
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  const section = await c.env.DB.prepare(
    "SELECT id, source_id, name, description, position, created_at, updated_at FROM sections WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("sectionId"), c.get("userId"))
    .first<Section>();
  return c.json({ data: section });
});

api.delete("/sections/:sectionId", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM sections WHERE id = ? AND user_id = ?")
    .bind(c.req.param("sectionId"), c.get("userId"))
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Section not found" } }, 404);
  return c.body(null, 204);
});

api.get("/vocabulary", async (c) => {
  const conditions = ["user_id = ?"];
  const values: (string | number)[] = [c.get("userId")];
  const sourceId = c.req.query("sourceId");
  const sectionId = c.req.query("sectionId");
  const status = c.req.query("status");
  if (sourceId) {
    conditions.push("source_id = ?");
    values.push(sourceId);
  }
  if (sectionId) {
    conditions.push("section_id = ?");
    values.push(sectionId);
  }
  if (c.req.query("rootOnly") === "true") conditions.push("section_id IS NULL");
  if (status && ["learning", "mastered", "archived"].includes(status)) {
    conditions.push("status = ?");
    values.push(status);
  } else if (status) {
    return validationError(c, "status must be learning, mastered, or archived");
  }
  const result = await c.env.DB.prepare(
    `SELECT id, source_id, section_id, word, notes, status, created_at, updated_at FROM vocabulary_items WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
  )
    .bind(...values)
    .all<VocabularyItem>();
  return c.json({ data: result.results });
});

api.post("/vocabulary", async (c) => {
  const parsed = await parseBody(c, vocabularyInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const userId = c.get("userId");
  if (parsed.data.sourceId) {
    const source = await c.env.DB.prepare("SELECT id FROM sources WHERE id = ? AND user_id = ?")
      .bind(parsed.data.sourceId, userId)
      .first();
    if (!source)
      return c.json({ error: { code: "INVALID_SOURCE", message: "Source not found" } }, 400);
  }
  let sourceId = parsed.data.sourceId ?? null;
  if (parsed.data.sectionId) {
    const section = await c.env.DB.prepare(
      "SELECT id, source_id FROM sections WHERE id = ? AND user_id = ?",
    )
      .bind(parsed.data.sectionId, userId)
      .first<{ id: string; source_id: string }>();
    if (!section)
      return c.json({ error: { code: "INVALID_SECTION", message: "Section not found" } }, 400);
    if (parsed.data.sourceId && section.source_id !== parsed.data.sourceId) {
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
    sourceId = section.source_id;
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO vocabulary_items (id, user_id, source_id, section_id, word, normalized_word, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      userId,
      sourceId,
      parsed.data.sectionId ?? null,
      parsed.data.word,
      parsed.data.word.toLocaleLowerCase(),
      parsed.data.notes ?? null,
      now,
      now,
    )
    .run();
  const item = await c.env.DB.prepare(
    "SELECT id, source_id, section_id, word, notes, status, created_at, updated_at FROM vocabulary_items WHERE id = ? AND user_id = ?",
  )
    .bind(id, userId)
    .first<VocabularyItem>();
  return c.json({ data: item }, 201);
});

api.get("/vocabulary/:itemId", async (c) => {
  const item = await c.env.DB.prepare(
    "SELECT id, source_id, section_id, word, notes, status, created_at, updated_at FROM vocabulary_items WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("itemId"), c.get("userId"))
    .first<VocabularyItem>();
  if (!item)
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  return c.json({ data: item });
});

api.patch("/vocabulary/:itemId", async (c) => {
  const parsed = await parseBody(c, vocabularyPatch);
  if ("error" in parsed) return validationError(c, parsed.error);
  const current = await c.env.DB.prepare(
    "SELECT id, word, notes, status FROM vocabulary_items WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("itemId"), c.get("userId"))
    .first<{ id: string; word: string; notes: string | null; status: string }>();
  if (!current)
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  const word = parsed.data.word ?? current.word;
  const notes = parsed.data.notes === undefined ? current.notes : parsed.data.notes;
  const status = parsed.data.status ?? current.status;
  await c.env.DB.prepare(
    "UPDATE vocabulary_items SET word = ?, normalized_word = ?, notes = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  )
    .bind(word, word.toLocaleLowerCase(), notes, status, Date.now(), current.id, c.get("userId"))
    .run();
  const item = await c.env.DB.prepare(
    "SELECT id, source_id, section_id, word, notes, status, created_at, updated_at FROM vocabulary_items WHERE id = ? AND user_id = ?",
  )
    .bind(current.id, c.get("userId"))
    .first<VocabularyItem>();
  return c.json({ data: item });
});

api.delete("/vocabulary/:itemId", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM vocabulary_items WHERE id = ? AND user_id = ?")
    .bind(c.req.param("itemId"), c.get("userId"))
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Vocabulary item not found" } }, 404);
  return c.body(null, 204);
});

api.get("/dictionary/entries", async (c) => {
  const term = c.req.query("term")?.trim();
  if (!term || term.length > 100)
    return validationError(c, "term is required and must be at most 100 characters");
  const apiKey = c.env.WEBSTER_LEARNERS_API_KEY;
  if (!apiKey)
    return c.json(
      {
        error: {
          code: "DICTIONARY_NOT_CONFIGURED",
          message: "Webster's Learner's Dictionary API key is not configured",
        },
      },
      503,
    );
  const normalizedTerm = term.toLocaleLowerCase();
  const cached = await c.env.DB.prepare(
    "SELECT response_json FROM dictionary_lookups WHERE provider = 'webster-learners' AND term = ? AND expires_at > ?",
  )
    .bind(normalizedTerm, Date.now())
    .first<{ response_json: string }>();
  if (cached) return c.json({ data: JSON.parse(cached.response_json), cached: true });

  const url = new URL(
    `https://www.dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(term)}`,
  );
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  if (!response.ok)
    return c.json(
      {
        error: { code: "DICTIONARY_PROVIDER_ERROR", message: "Dictionary provider request failed" },
      },
      502,
    );
  const dictionaryData: unknown = await response.json();
  const now = Date.now();
  const statements = [
    c.env.DB.prepare(
      "INSERT INTO dictionary_lookups (id, provider, term, response_json, fetched_at, expires_at) VALUES (?, 'webster-learners', ?, ?, ?, ?) ON CONFLICT(provider, term) DO UPDATE SET response_json = excluded.response_json, fetched_at = excluded.fetched_at, expires_at = excluded.expires_at",
    ).bind(
      crypto.randomUUID(),
      normalizedTerm,
      JSON.stringify(dictionaryData),
      now,
      now + 30 * 24 * 60 * 60 * 1000,
    ),
    c.env.DB.prepare(
      "DELETE FROM dictionary_entries WHERE provider = 'webster-learners' AND lookup_term = ?",
    ).bind(normalizedTerm),
  ];
  if (Array.isArray(dictionaryData)) {
    dictionaryData.forEach((value, position) => {
      if (!isRecord(value)) return;
      const meta = isRecord(value.meta) ? value.meta : {};
      const headwordInfo = isRecord(value.hwi) ? value.hwi : {};
      const firstPronunciation =
        Array.isArray(headwordInfo.prs) && isRecord(headwordInfo.prs[0]) ? headwordInfo.prs[0] : {};
      const sound = isRecord(firstPronunciation.sound) ? firstPronunciation.sound : {};
      const headword = typeof headwordInfo.hw === "string" ? headwordInfo.hw : term;
      const entryKey = typeof meta.id === "string" ? meta.id : `${headword}:${position}`;
      const shortDefinitions = Array.isArray(value.shortdef)
        ? value.shortdef.filter(
            (definition): definition is string => typeof definition === "string",
          )
        : [];
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO dictionary_entries (id, provider, lookup_term, entry_key, headword, part_of_speech, pronunciation, audio_filename, short_definitions_json, entry_json, position) VALUES (?, 'webster-learners', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          normalizedTerm,
          entryKey,
          headword,
          typeof value.fl === "string" ? value.fl : null,
          typeof firstPronunciation.mw === "string" ? firstPronunciation.mw : null,
          typeof sound.audio === "string" ? sound.audio : null,
          JSON.stringify(shortDefinitions),
          JSON.stringify(value),
          position,
        ),
      );
    });
  }
  await c.env.DB.batch(statements);
  return c.json({ data: dictionaryData, cached: false });
});

api.get("/wordlists", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT id, slug, name, description, source_url, created_at FROM wordlists ORDER BY name",
  ).all();
  return c.json({ data: result.results });
});

api.get("/wordlists/:slug/entries", async (c) => {
  const slug = c.req.param("slug");
  const levelParam = c.req.query("level");
  const limitParam = Number(c.req.query("limit") ?? 100);
  const offsetParam = Number(c.req.query("offset") ?? 0);
  if (!Number.isInteger(limitParam) || limitParam < 1 || limitParam > 500)
    return validationError(c, "limit must be an integer between 1 and 500");
  if (!Number.isInteger(offsetParam) || offsetParam < 0)
    return validationError(c, "offset must be a non-negative integer");
  const wordlist = await c.env.DB.prepare("SELECT id FROM wordlists WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>();
  if (!wordlist)
    return c.json({ error: { code: "NOT_FOUND", message: "Wordlist not found" } }, 404);
  let query =
    "SELECT e.id, e.word, e.part_of_speech, e.level, e.position, p.status AS progress FROM wordlist_entries e LEFT JOIN wordlist_progress p ON p.entry_id = e.id AND p.user_id = ? WHERE e.wordlist_id = ?";
  const values: (string | number)[] = [c.get("userId"), wordlist.id];
  if (levelParam !== undefined) {
    const level = Number(levelParam);
    if (!Number.isInteger(level) || level < 1)
      return validationError(c, "level must be a positive integer");
    query += " AND e.level = ?";
    values.push(level);
  }
  query += " ORDER BY e.position LIMIT ? OFFSET ?";
  values.push(limitParam, offsetParam);
  const result = await c.env.DB.prepare(query)
    .bind(...values)
    .all();
  return c.json({ data: result.results });
});

api.put("/wordlists/:slug/entries/:entryId/progress", async (c) => {
  const parsed = await parseBody(c, progressInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const result = await c.env.DB.prepare(
    "INSERT INTO wordlist_progress (user_id, entry_id, status, updated_at) SELECT ?, e.id, ?, ? FROM wordlist_entries e JOIN wordlists w ON w.id = e.wordlist_id WHERE e.id = ? AND w.slug = ? ON CONFLICT(user_id, entry_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at",
  )
    .bind(
      c.get("userId"),
      parsed.data.status,
      Date.now(),
      c.req.param("entryId"),
      c.req.param("slug"),
    )
    .run();
  if (result.meta.changes === 0)
    return c.json({ error: { code: "NOT_FOUND", message: "Wordlist entry not found" } }, 404);
  return c.json({ data: { entryId: c.req.param("entryId"), status: parsed.data.status } });
});

app.route("/api/v1", api);

export default app;
