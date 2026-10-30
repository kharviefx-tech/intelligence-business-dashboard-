import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & { businessIqPool?: Pool };

export function getNeonPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing. Configure the pooled BUSINESSIQ Neon connection string in Vercel.");
  if (!globalForPg.businessIqPool) {
    globalForPg.businessIqPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: true },
    });
  }
  return globalForPg.businessIqPool;
}
