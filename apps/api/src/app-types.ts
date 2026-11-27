import type { Database } from "./db/index.js";
import type { Env } from "./env.js";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    userId: string;
  };
};
