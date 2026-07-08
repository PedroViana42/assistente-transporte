import { Pool, type QueryResult, type QueryResultRow } from "pg";

type GlobalWithPool = typeof globalThis & {
  transportPool?: Pool;
};

function normalizeDatabaseUrl(url: string): string {
  const normalized = url.replace("postgresql+psycopg2://", "postgresql://");
  const parsed = new URL(normalized);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  return new Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: databaseUrl.includes("sslmode=") ? { rejectUnauthorized: false } : undefined
  });
}

export function getPool(): Pool {
  const globalForPool = globalThis as GlobalWithPool;

  if (!globalForPool.transportPool) {
    globalForPool.transportPool = createPool();
  }

  return globalForPool.transportPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
