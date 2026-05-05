import Database from "@tauri-apps/plugin-sql";
import {
  CompiledQuery,
  DatabaseConnection,
  Dialect,
  Driver,
  Kysely,
  QueryResult,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";

class TauriSqliteConnection implements DatabaseConnection {
  constructor(private readonly db: Database) {}

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters } = compiledQuery;
    const params = parameters as unknown[];

    if (/^\s*(select|pragma)/i.test(sql)) {
      const rows = await this.db.select<any[]>(sql, params);
      return { rows: rows as O[] };
    }

    const result = await this.db.execute(sql, params);
    return {
      rows: [],
      insertId: result.lastInsertId !== undefined ? BigInt(result.lastInsertId) : undefined,
      numAffectedRows: BigInt(result.rowsAffected),
    };
  }

  async *streamQuery<O>(): AsyncIterableIterator<QueryResult<O>> {
    throw new Error("Tauri SQLite driver does not support streaming queries");
  }
}

class TauriSqliteDriver implements Driver {
  private db: Database | null = null;
  private connection: TauriSqliteConnection | null = null;

  constructor(private readonly dbPath: string) {}

  async init(): Promise<void> {
    this.db = await Database.load(this.dbPath);
    this.connection = new TauriSqliteConnection(this.db);
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    if (!this.connection) throw new Error("Driver not initialized");
    return this.connection;
  }

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"));
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"));
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"));
  }

  async releaseConnection(_conn: DatabaseConnection): Promise<void> {}

  async destroy(): Promise<void> {
    await this.db?.close();
  }
}

export class TauriSqliteDialect implements Dialect {
  constructor(private readonly dbPath: string) {}

  createAdapter() {
    return new SqliteAdapter();
  }

  createDriver() {
    return new TauriSqliteDriver(this.dbPath);
  }

  createIntrospector(db: Kysely<unknown>) {
    return new SqliteIntrospector(db);
  }

  createQueryCompiler() {
    return new SqliteQueryCompiler();
  }
}
