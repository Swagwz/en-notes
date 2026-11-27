import type { Context } from "hono";
import { z } from "zod";
import { createAuth } from "../auth.js";
import type { AppEnv } from "../app-types.js";
import * as authModel from "../models/auth.model.js";
import { parseBody, validationError } from "../utils/http.js";

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

async function forwardAuth(c: Context<AppEnv>, endpoint: string, includeBody: boolean) {
  const url = new URL(c.req.url);
  url.pathname = `/api/v1/auth${endpoint}`;
  url.search = "";
  const request = new Request(url, {
    method: "POST",
    headers: authRequestHeaders(c),
    body: includeBody ? await c.req.raw.arrayBuffer() : undefined,
  });
  const response = await createAuth(c.env).handler(request);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function bootstrapAdmin(c: Context<AppEnv>) {
  const configuredSecret = c.env.BOOTSTRAP_SECRET;
  const email = c.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredSecret || !email) {
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

  const db = c.get("db");
  if (await authModel.hasUsers(db)) {
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

  const suppliedSecret = c.req.header("X-Bootstrap-Secret") ?? "";
  if (!constantTimeEqual(suppliedSecret, configuredSecret)) {
    return c.json(
      { error: { code: "INVALID_BOOTSTRAP_SECRET", message: "Bootstrap secret is invalid" } },
      403,
    );
  }

  const parsed = await parseBody(c, bootstrapInput);
  if ("error" in parsed) return validationError(c, parsed.error);
  const id = crypto.randomUUID();
  try {
    await authModel.createInitialAdmin(db, {
      id,
      name: parsed.data.name,
      email,
      password: parsed.data.password,
      now: Date.now(),
    });
  } catch (error) {
    if (await authModel.hasUsers(db)) {
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
    throw error;
  }

  return c.json({ data: { id, name: parsed.data.name, email, role: "admin" } }, 201);
}

export function signIn(c: Context<AppEnv>) {
  return forwardAuth(c, "/sign-in/email", true);
}

export async function currentSession(c: Context<AppEnv>) {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: { code: "UNAUTHENTICATED", message: "Sign in is required" } }, 401);
  }
  return c.json({ data: session });
}

export function signOut(c: Context<AppEnv>) {
  return forwardAuth(c, "/sign-out", false);
}

export async function createUser(c: Context<AppEnv>) {
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
}
