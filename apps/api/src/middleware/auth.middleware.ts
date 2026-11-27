import type { MiddlewareHandler } from "hono";
import { createAuth } from "../auth.js";
import type { AppEnv } from "../app-types.js";

export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: { code: "UNAUTHENTICATED", message: "Sign in is required" } }, 401);
  }
  c.set("userId", session.user.id);
  await next();
};
