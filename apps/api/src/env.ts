export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  BOOTSTRAP_SECRET?: string;
  API_DOCS_ENABLED?: string;
  WEBSTER_LEARNERS_API_KEY?: string;
}
