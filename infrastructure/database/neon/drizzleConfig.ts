import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

export default defineConfig({
  schema: "./infrastructure/database/neon/schema.ts",
  out: "./infrastructure/database/neon/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "mimi",
  },
  strict: true,
  verbose: true,
});
