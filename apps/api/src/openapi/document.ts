export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "EN Notes API",
    version: "1.0.0",
    description:
      "Private vocabulary API. Protected endpoints require the Better Auth session cookie.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Authentication" },
    { name: "Sources" },
    { name: "Sections" },
    { name: "Vocabulary" },
    { name: "Dictionary" },
    { name: "Wordlists" },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", const: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/bootstrap": {
      post: {
        tags: ["Authentication"],
        summary: "Create the first administrator",
        description:
          "One-time setup. Requires the configured bootstrap secret and an empty users table.",
        parameters: [
          { in: "header", name: "X-Bootstrap-Secret", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "password"],
                properties: {
                  name: { type: "string" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Administrator created" },
          "403": { description: "Invalid bootstrap secret" },
          "409": { description: "Bootstrap already completed" },
        },
      },
    },
    "/api/v1/sessions": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Session created; session cookie is set" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/sessions/current": {
      get: {
        tags: ["Authentication"],
        summary: "Get the current session",
        responses: {
          "200": { description: "Current session" },
          "401": { description: "Not authenticated" },
        },
      },
      delete: {
        tags: ["Authentication"],
        summary: "Sign out",
        responses: { "200": { description: "Session ended" } },
      },
    },
    "/api/v1/users": {
      post: {
        tags: ["Authentication"],
        summary: "Create a user account",
        description: "Administrator only. Public sign-up is disabled; no invitation email is sent.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "User created" },
          "401": { description: "Not authenticated" },
          "403": { description: "Administrator role required" },
        },
      },
    },
    "/api/v1/sources": {
      get: {
        tags: ["Sources"],
        summary: "List sources",
        responses: { "200": { description: "User's sources" } },
      },
      post: {
        tags: ["Sources"],
        summary: "Create a source",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SourceInput" } } },
        },
        responses: { "201": { description: "Source created" } },
      },
    },
    "/api/v1/sources/{sourceId}": {
      get: {
        tags: ["Sources"],
        summary: "Get a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "200": { description: "Source" }, "404": { description: "Source not found" } },
      },
      patch: {
        tags: ["Sources"],
        summary: "Update a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SourcePatch" } } },
        },
        responses: { "200": { description: "Source updated" } },
      },
      delete: {
        tags: ["Sources"],
        summary: "Delete a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "204": { description: "Source deleted" } },
      },
    },
    "/api/v1/sources/{sourceId}/sections": {
      get: {
        tags: ["Sections"],
        summary: "List sections in a source",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        responses: { "200": { description: "Source sections" } },
      },
      post: {
        tags: ["Sections"],
        summary: "Create a section",
        parameters: [{ $ref: "#/components/parameters/sourceId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SectionInput" } },
          },
        },
        responses: { "201": { description: "Section created" } },
      },
    },
    "/api/v1/sections/{sectionId}": {
      patch: {
        tags: ["Sections"],
        summary: "Update a section",
        parameters: [{ $ref: "#/components/parameters/sectionId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SectionPatch" } },
          },
        },
        responses: { "200": { description: "Section updated" } },
      },
      delete: {
        tags: ["Sections"],
        summary: "Delete a section",
        parameters: [{ $ref: "#/components/parameters/sectionId" }],
        responses: { "204": { description: "Section deleted" } },
      },
    },
    "/api/v1/vocabulary": {
      get: {
        tags: ["Vocabulary"],
        summary: "List vocabulary items",
        parameters: [
          { in: "query", name: "sourceId", schema: { type: "string", format: "uuid" } },
          { in: "query", name: "sectionId", schema: { type: "string", format: "uuid" } },
          { in: "query", name: "rootOnly", schema: { type: "boolean" } },
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["learning", "mastered", "archived"] },
          },
        ],
        responses: { "200": { description: "Vocabulary items" } },
      },
      post: {
        tags: ["Vocabulary"],
        summary: "Add a vocabulary item",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VocabularyInput" } },
          },
        },
        responses: { "201": { description: "Vocabulary item created" } },
      },
    },
    "/api/v1/vocabulary/{itemId}": {
      get: {
        tags: ["Vocabulary"],
        summary: "Get a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        responses: {
          "200": { description: "Vocabulary item" },
          "404": { description: "Item not found" },
        },
      },
      patch: {
        tags: ["Vocabulary"],
        summary: "Update a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VocabularyPatch" } },
          },
        },
        responses: { "200": { description: "Vocabulary item updated" } },
      },
      delete: {
        tags: ["Vocabulary"],
        summary: "Delete a vocabulary item",
        parameters: [{ $ref: "#/components/parameters/itemId" }],
        responses: { "204": { description: "Vocabulary item deleted" } },
      },
    },
    "/api/v1/dictionary/entries": {
      get: {
        tags: ["Dictionary"],
        summary: "Look up a term in Webster's Learner's Dictionary",
        parameters: [
          { in: "query", name: "term", required: true, schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description:
              "Clean entries are stored permanently in D1. cached is true when an existing record is returned and false when fetched from Webster.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "cached"],
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["word", "partOfSpeech", "phonetic", "audioUrl", "meanings"],
                        properties: {
                          word: { type: "string" },
                          partOfSpeech: { type: "string" },
                          phonetic: { type: "string" },
                          audioUrl: { type: ["string", "null"] },
                          meanings: {
                            type: "array",
                            items: {
                              type: "object",
                              required: ["definition", "examples"],
                              properties: {
                                definition: { type: "string" },
                                examples: { type: "array", items: { type: "string" } },
                              },
                            },
                          },
                        },
                      },
                    },
                    cached: { type: "boolean" },
                  },
                },
              },
            },
          },
          "503": {
            description: "No stored lookup exists and the dictionary API key is not configured",
          },
          "502": {
            description: "Dictionary provider request failed or returned an unsupported response",
          },
        },
      },
    },
    "/api/v1/wordlists": {
      get: {
        tags: ["Wordlists"],
        summary: "List available wordlists",
        responses: { "200": { description: "Wordlists" } },
      },
    },
    "/api/v1/wordlists/{slug}/entries": {
      get: {
        tags: ["Wordlists"],
        summary: "List entries in a wordlist",
        parameters: [
          { in: "path", name: "slug", required: true, schema: { type: "string" } },
          { in: "query", name: "level", schema: { type: "integer" } },
          { in: "query", name: "limit", schema: { type: "integer", default: 100, maximum: 500 } },
          { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": { description: "Wordlist entries with current user's progress" },
          "404": { description: "Wordlist not found" },
        },
      },
    },
    "/api/v1/wordlists/{slug}/entries/{entryId}/progress": {
      put: {
        tags: ["Wordlists"],
        summary: "Set wordlist entry progress",
        parameters: [
          { in: "path", name: "slug", required: true, schema: { type: "string" } },
          {
            in: "path",
            name: "entryId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["learning", "mastered", "ignored"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Progress saved" },
          "404": { description: "Wordlist entry not found" },
        },
      },
    },
  },
  components: {
    parameters: {
      sourceId: {
        in: "path",
        name: "sourceId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      sectionId: {
        in: "path",
        name: "sectionId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      itemId: {
        in: "path",
        name: "itemId",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      SourceInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", maxLength: 120 },
          type: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
      SourcePatch: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", maxLength: 120 },
          type: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
      SectionInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", maxLength: 120 },
          description: { type: ["string", "null"] },
          position: { type: ["integer", "null"], minimum: 0 },
        },
      },
      SectionPatch: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", maxLength: 120 },
          description: { type: ["string", "null"] },
          position: { type: ["integer", "null"], minimum: 0 },
        },
      },
      VocabularyInput: {
        type: "object",
        required: ["word"],
        properties: {
          word: { type: "string", maxLength: 200 },
          sourceId: { type: ["string", "null"], format: "uuid" },
          sectionId: { type: ["string", "null"], format: "uuid" },
          notes: { type: ["string", "null"] },
        },
      },
      VocabularyPatch: {
        type: "object",
        properties: {
          word: { type: "string", maxLength: 200 },
          notes: { type: ["string", "null"] },
          status: { type: "string", enum: ["learning", "mastered", "archived"] },
        },
      },
    },
  },
};
