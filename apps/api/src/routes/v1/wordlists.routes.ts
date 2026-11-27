import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as controller from "../../controllers/wordlists.controller.js";

const routes = new Hono<AppEnv>();

routes.get("/", controller.listWordlists);
routes.get("/:slug/entries", controller.listWordlistEntries);
routes.put("/:slug/entries/:entryId/progress", controller.setWordlistProgress);

export default routes;
