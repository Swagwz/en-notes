# EN Notes agent entry

This file is the root-level project-documentation entry point. The canonical agent documentation is in [`agent/`](./agent/README.md).

## Find the right document

| If you need to…                                                | Read                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Understand the intended product, users, and accepted decisions | [Product overview](./agent/project-overview.md)               |
| Understand the monorepo and runtime boundaries                 | [Architecture](./agent/architecture.md)                       |
| Change D1 tables, relationships, or migrations                 | [Data model](./agent/data-model.md)                           |
| Add or change REST endpoints or OpenAPI documentation          | [API contract](./agent/api.md)                                |
| Work on login, bootstrap, abuse prevention, or deployment      | [Security and deployment](./agent/security-and-deployment.md) |
| Run the web app, API, checks, or local D1                      | [Development guide](./agent/development.md)                   |
| Pick up unfinished work or distinguish done from planned       | [Roadmap and status](./agent/roadmap.md)                      |
| Find external specifications and original sources              | [References](./agent/references.md)                           |
| Understand Merriam-Webster JSON fields and display tokens      | [Webster JSON format](./agent/webster-json-format.md)         |

## Reading rules for future agents

1. Start with [the documentation index](./agent/README.md), then follow the topic link above; avoid reading every document for a narrow change.
2. Verify status against the source files named in each document. API routes, controllers, Drizzle models, and OpenAPI are separated under [apps/api/src/](./apps/api/src/); domain schemas live in [apps/api/src/db/schema/](./apps/api/src/db/schema/), while generated D1 migration history lives in [apps/api/migrations/](./apps/api/migrations/).
3. Keep plans separate from shipped behavior. The frontend is still a Vite/React starter and the CEEC wordlist tables are not populated.
4. Update the relevant `agent/*.md` document when a design decision changes or a planned item becomes implemented.
