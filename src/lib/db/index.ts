import { Pool, QueryResult, QueryResultRow } from "pg";
import { PGlite } from "@electric-sql/pglite";
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
  private pglite: PGlite | null = null;
  private initPromise: Promise<PGlite> | null = null;
  private dataDir?: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir;
  }

  private async getClient(): Promise<PGlite> {
    if (this.pglite) return this.pglite;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      let extObj = {};
      try {
        const { vector } = await import("@electric-sql/pglite/vector");
        extObj = { vector };
      } catch (err: any) {
        console.warn("[PGlite] Vector extension dynamic bundle warning:", err.message);
      }

      const instance = new PGlite({
        dataDir: this.dataDir,
        extensions: extObj,
      });

      this.pglite = instance;
      return instance;
    })();

    return this.initPromise;
  }

  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
    const client = await this.getClient();
    const res = await client.query<T>(sql, params);
    return { rows: res.rows };
  }

  async exec(sql: string): Promise<void> {
    const client = await this.getClient();
    await client.exec(sql);
  }

  async close(): Promise<void> {
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
      this.initPromise = null;
    }
  }
}

const globalForDb = globalThis as unknown as {
  __cleDbInstance?: DatabaseClient | null;
  __cleMigrationPromise?: Promise<void> | null;
};

async function ensureMigrated(client: DatabaseClient): Promise<void> {
  if (globalForDb.__cleMigrationPromise) {
    return globalForDb.__cleMigrationPromise;
  }

  globalForDb.__cleMigrationPromise = (async () => {
    try {
      console.log("[DB] Tự động khởi tạo cấu trúc bảng từ schema.sql...");
      await runMigrations(client);
      console.log("[DB] Khởi tạo cấu trúc bảng thành công.");
    } catch (err) {
      console.error("[DB] Lỗi kiểm tra / khởi tạo migrations:", err);
      globalForDb.__cleMigrationPromise = null;
      throw err;
    }
  })();

  return globalForDb.__cleMigrationPromise;
}

export async function getDb(): Promise<DatabaseClient> {
  if (globalForDb.__cleDbInstance) {
    await ensureMigrated(globalForDb.__cleDbInstance);
    return globalForDb.__cleDbInstance;
  }

  const usePGlite = process.env.USE_PGLITE === "true" || !process.env.DATABASE_URL;

  if (usePGlite) {
    // Trong môi trường test, luôn dùng in-memory (undefined) để tránh xung đột file lock đa tiến trình
    const dataDir =
      process.env.NODE_ENV === "test"
        ? undefined
        : process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), ".cle-pglite-data");
    const client = new PGliteClient(dataDir);
    globalForDb.__cleDbInstance = client;
    await ensureMigrated(client);
    return client;
  }

  const client = new PostgresClient(process.env.DATABASE_URL!);
  globalForDb.__cleDbInstance = client;
  await ensureMigrated(client);
  return client;
}

export async function runMigrations(client: DatabaseClient): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "src/lib/db/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await client.exec(schemaSql);
}

export async function closeDb(): Promise<void> {
  if (globalForDb.__cleDbInstance) {
    await globalForDb.__cleDbInstance.close();
    globalForDb.__cleDbInstance = null;
    globalForDb.__cleMigrationPromise = null;
  }
}
