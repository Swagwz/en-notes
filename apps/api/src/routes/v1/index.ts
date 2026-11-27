import { Hono } from "hono";
import type { AppEnv } from "../../app-types.js";
import * as authController from "../../controllers/auth.controller.js";
import { requireSession } from "../../middleware/auth.middleware.js";
import dictionaryRoutes from "./dictionary.routes.js";
import sectionsRoutes from "./sections.routes.js";
import sourcesRoutes from "./sources.routes.js";
import vocabularyRoutes from "./vocabulary.routes.js";
import wordlistsRoutes from "./wordlists.routes.js";

const routes = new Hono<AppEnv>();
const protectedRoutes = new Hono<AppEnv>();

routes.post("/bootstrap", authController.bootstrapAdmin);
routes.post("/sessions", authController.signIn);
routes.get("/sessions/current", authController.currentSession);
routes.delete("/sessions/current", authController.signOut);

protectedRoutes.use("*", requireSession);
protectedRoutes.post("/users", authController.createUser);
protectedRoutes.route("/sources", sourcesRoutes);
protectedRoutes.route("/sections", sectionsRoutes);
protectedRoutes.route("/vocabulary", vocabularyRoutes);
protectedRoutes.route("/dictionary", dictionaryRoutes);
protectedRoutes.route("/wordlists", wordlistsRoutes);

routes.route("/", protectedRoutes);

export default routes;
