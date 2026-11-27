import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as controller from "../../controllers/vocabulary.controller.js";

const routes = new Hono<AppEnv>();

routes.get("/", controller.listVocabulary);
routes.post("/", controller.createVocabularyItem);
routes.get("/:itemId", controller.getVocabularyItem);
routes.patch("/:itemId", controller.updateVocabularyItem);
routes.delete("/:itemId", controller.deleteVocabularyItem);

export default routes;
