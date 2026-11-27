import type { MiddlewareHandler } from "hono";
import { createDb } from "../db/index.js";
import type { AppEnv } from "../app-types.js";

export const attachDatabase: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
};
