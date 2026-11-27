import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as controller from "../../controllers/sections.controller.js";

const routes = new Hono<AppEnv>();

routes.patch("/:sectionId", controller.updateSection);
routes.delete("/:sectionId", controller.deleteSection);

export default routes;
