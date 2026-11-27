import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as controller from "../../controllers/sources.controller.js";
import * as sectionsController from "../../controllers/sections.controller.js";

const routes = new Hono<AppEnv>();

routes.get("/", controller.listSources);
routes.post("/", controller.createSource);
routes.get("/:sourceId", controller.getSource);
routes.patch("/:sourceId", controller.updateSource);
routes.delete("/:sourceId", controller.deleteSource);
routes.get("/:sourceId/sections", sectionsController.listSections);
routes.post("/:sourceId/sections", sectionsController.createSection);

export default routes;
