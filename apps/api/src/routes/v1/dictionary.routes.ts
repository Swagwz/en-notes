import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as controller from "../../controllers/dictionary.controller.js";

const routes = new Hono<AppEnv>();

routes.get("/entries", controller.lookupDictionaryEntry);

export default routes;
