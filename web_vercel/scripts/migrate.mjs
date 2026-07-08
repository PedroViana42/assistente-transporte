import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

function normalizeDatabaseUrl(url) {
  const normalized = url.replace("postgresql+psycopg2://", "postgresql://");
  const parsed = new URL(normalized);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}

const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = rawDatabaseUrl ? normalizeDatabaseUrl(rawDatabaseUrl) : null;

if (!databaseUrl) {
  console.error("DATABASE_URL nao configurada.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: rawDatabaseUrl.includes("sslmode=")
    ? { rejectUnauthorized: false }
    : undefined
});

try {
  const sql = await readFile(join(__dirname, "..", "sql", "001_web_manual_careacao.sql"), "utf8");
  await pool.query(sql);
  console.log("Migracao web aplicada com sucesso.");
} finally {
  await pool.end();
}
