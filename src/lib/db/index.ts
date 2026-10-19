import { Pool, QueryResult, QueryResultRow } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import fs from "fs";
import path from "path";

export interface DatabaseClient {
  query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

class PostgresClient implements DatabaseClient {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
    const res: QueryResult<T> = await this.pool.query<T>(sql, params);
    return { rows: res.rows };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGliteClient implements DatabaseClient {
  private pglite: PGlite;

  constructor(dataDir?: string) {
    this.pglite = new PGlite({
      dataDir,
      extensions: { vector },
    });
  }

  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
    const res = await this.pglite.query<T>(sql, params);
    return { rows: res.rows };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }

  getRaw(): PGlite {
    return this.pglite;
  }
}

let dbInstance: DatabaseClient | null = null;

export async function getDb(): Promise<DatabaseClient> {
  if (dbInstance) return dbInstance;

  const usePGlite = process.env.USE_PGLITE === "true" || !process.env.DATABASE_URL;

  if (usePGlite) {
    const dataDir = process.env.PGLITE_DATA_DIR || undefined;
    const client = new PGliteClient(dataDir);
    dbInstance = client;
    return client;
  }

  const client = new PostgresClient(process.env.DATABASE_URL!);
  dbInstance = client;
  return client;
}

export async function runMigrations(client: DatabaseClient): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "src/lib/db/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await client.exec(schemaSql);
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
