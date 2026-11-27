import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import type { AppEnv } from "./app-types.js";
import { attachDatabase } from "./middleware/database.middleware.js";
import { openApiDocument } from "./openapi/document.js";
import v1Routes from "./routes/v1/index.js";

const app = new Hono<AppEnv>();

app.use("*", attachDatabase);
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/v1/openapi.json", (c) =>
  c.env.API_DOCS_ENABLED === "true" ? c.json(openApiDocument) : c.notFound(),
);
app.get(
  "/api/v1/docs",
  (c, next) => (c.env.API_DOCS_ENABLED === "true" ? next() : c.notFound()),
  swaggerUI({ url: "/api/v1/openapi.json" }),
);
app.route("/api/v1", v1Routes);

export default app;
