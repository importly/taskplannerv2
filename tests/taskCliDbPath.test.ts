import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAppDbPath } from "../cli/dbPath";
import { acquireMsCliToken } from "../cli/msCliAuth";
import { createSqliteTaskRepository, openCliDb } from "../cli/sqliteTaskRepository";

describe("resolveAppDbPath", () => {
  test("uses ACCOUNTABILITY_DB_PATH when provided", () => {
    expect(
      resolveAppDbPath(
        { ACCOUNTABILITY_DB_PATH: "D:\\data\\custom-accountability.db", APPDATA: "C:\\Users\\aryan\\AppData\\Roaming" },
        "win32",
        "C:\\Users\\aryan",
      ),
    ).toBe("D:\\data\\custom-accountability.db");
  });

  test("resolves the Windows app data database path", () => {
    expect(
      resolveAppDbPath(
        { APPDATA: "C:\\Users\\aryan\\AppData\\Roaming" },
        "win32",
        "C:\\Users\\aryan",
      ),
    ).toBe("C:\\Users\\aryan\\AppData\\Roaming\\com.aryan.accountability\\accountability.db");
  });

  test("falls back to home AppData on Windows when APPDATA is missing", () => {
    expect(resolveAppDbPath({}, "win32", "C:\\Users\\aryan")).toBe(
      "C:\\Users\\aryan\\AppData\\Roaming\\com.aryan.accountability\\accountability.db",
    );
  });

  test("resolves the macOS Application Support database path", () => {
    expect(resolveAppDbPath({}, "darwin", "/Users/aryan")).toBe(
      "/Users/aryan/Library/Application Support/com.aryan.accountability/accountability.db",
    );
  });

  test("resolves the Linux XDG config database path", () => {
    expect(resolveAppDbPath({ XDG_CONFIG_HOME: "/home/aryan/.config" }, "linux", "/home/aryan")).toBe(
      "/home/aryan/.config/com.aryan.accountability/accountability.db",
    );
  });

  test("falls back to home config on Linux when XDG_CONFIG_HOME is missing", () => {
    expect(resolveAppDbPath({}, "linux", "/home/aryan")).toBe(
      "/home/aryan/.config/com.aryan.accountability/accountability.db",
    );
  });
});

describe("CLI source boundaries", () => {
  test("keeps bun:sqlite imports outside browser source", async () => {
    const srcFiles = await Array.fromAsync(new Bun.Glob("src/**/*.ts*").scan({ cwd: import.meta.dir + "/.." }));
    const filesWithBunSqlite: string[] = [];

    for (const file of srcFiles) {
      const source = await Bun.file(new URL(`../${file}`, import.meta.url)).text();
      if (source.includes("bun:sqlite")) filesWithBunSqlite.push(file);
    }

    expect(filesWithBunSqlite).toEqual([]);
  });

  test("keeps CLI modules independent of Tauri APIs", async () => {
    const cliFiles = ["cli/dbPath.ts", "cli/sqliteTaskRepository.ts", "cli/msCliAuth.ts"];
    const tauriImports: string[] = [];

    for (const file of cliFiles) {
      const source = await Bun.file(new URL(`../${file}`, import.meta.url)).text();
      if (source.includes("@tauri-apps/")) tauriImports.push(file);
    }

    expect(tauriImports).toEqual([]);
  });
});

function makeDb(): Database {
  const db = new Database(":memory:");
  db.query("PRAGMA foreign_keys = ON").run();
  db.query("CREATE TABLE user_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)").run();
  db.query(`
    CREATE TABLE goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      archived_at TIMESTAMP DEFAULT NULL
    )
  `).run();
  db.query(`
    CREATE TABLE cached_tasks (
      ms_task_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      status TEXT,
      due_date TIMESTAMP,
      list_id TEXT,
      linked_goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL
    )
  `).run();
  return db;
}

describe("createSqliteTaskRepository", () => {
  test("enables foreign keys when opening a production CLI database path", () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "accountability-cli-db-")), "accountability.db");
    const db = openCliDb(dbPath);

    expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    db.close();
  });

  test("lists cached tasks with derived linked goal titles", async () => {
    const db = makeDb();
    db.query("INSERT INTO goals (id, title) VALUES (?, ?)").run("goal-1", "Deep Work");
    db.query(`
      INSERT INTO cached_tasks (ms_task_id, title, body, status, due_date, list_id, linked_goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("task-1", "Write", null, "notStarted", null, "list-1", "goal-1");

    const tasks = await createSqliteTaskRepository(db).listCachedTasks();

    expect(tasks).toEqual([
      {
        ms_task_id: "task-1",
        title: "Write",
        body: null,
        status: "notStarted",
        due_date: null,
        list_id: "list-1",
        linked_goal_id: "goal-1",
        linked_goal_title: "Deep Work",
      },
    ]);
  });

  test("preserves existing linked goal ids on upsert conflict", async () => {
    const db = makeDb();
    db.query("INSERT INTO goals (id, title) VALUES (?, ?)").run("goal-1", "Deep Work");
    const repository = createSqliteTaskRepository(db);

    await repository.upsertTasks([
      {
        ms_task_id: "task-1",
        title: "Original",
        body: null,
        status: "notStarted",
        due_date: null,
        list_id: "list-1",
        linked_goal_id: "goal-1",
      },
    ]);
    await repository.upsertTasks([
      {
        ms_task_id: "task-1",
        title: "Remote update",
        body: "Updated body",
        status: "inProgress",
        due_date: "2026-06-10T00:00:00.000Z",
        list_id: "list-2",
        linked_goal_id: null,
      },
    ]);

    expect(await repository.listCachedTasks()).toEqual([
      {
        ms_task_id: "task-1",
        title: "Remote update",
        body: "Updated body",
        status: "inProgress",
        due_date: "2026-06-10T00:00:00.000Z",
        list_id: "list-2",
        linked_goal_id: "goal-1",
        linked_goal_title: "Deep Work",
      },
    ]);
  });

  test("trims empty refs to missing", async () => {
    const db = makeDb();
    const repository = createSqliteTaskRepository(db);

    expect(await repository.findTaskRef("   ")).toEqual({ kind: "missing", matches: [] });
    expect(await repository.findGoalRef("   ")).toEqual({ kind: "missing", matches: [] });
  });

  test("ignores non-allowlisted dynamic update fields", async () => {
    const db = makeDb();
    db.query("INSERT INTO goals (id, title) VALUES (?, ?)").run("goal-1", "Deep Work");
    db.query(`
      INSERT INTO cached_tasks (ms_task_id, title, body, status, due_date, list_id, linked_goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("task-1", "Write", null, "notStarted", null, "list-1", "goal-1");
    const repository = createSqliteTaskRepository(db);

    await repository.updateTask("task-1", { linked_goal_title: "Should not write" } as never);

    expect(await repository.listCachedTasks()).toEqual([
      {
        ms_task_id: "task-1",
        title: "Write",
        body: null,
        status: "notStarted",
        due_date: null,
        list_id: "list-1",
        linked_goal_id: "goal-1",
        linked_goal_title: "Deep Work",
      },
    ]);
  });
});

describe("acquireMsCliToken", () => {
  test("returns an unexpired shared app token", async () => {
    const db = makeDb();
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_access_token", "access-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run(
      "ms_token_expires_at",
      (1_000_000).toString(),
    );

    expect(await acquireMsCliToken(db, { now: () => 1 })).toBe("access-token");
  });

  test("refreshes expired shared app tokens and stores the response", async () => {
    const db = makeDb();
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_access_token", "old-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_refresh_token", "refresh-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_token_expires_at", "1");

    const token = await acquireMsCliToken(db, {
      now: () => 1_000_000,
      fetch: async () =>
        new Response(
          JSON.stringify({ access_token: "new-token", refresh_token: "new-refresh", expires_in: 3600 }),
          { status: 200 },
        ),
    });

    expect(token).toBe("new-token");
    expect(db.query("SELECT value FROM user_settings WHERE key = ?").get("ms_access_token")).toEqual({
      value: "new-token",
    });
    expect(db.query("SELECT value FROM user_settings WHERE key = ?").get("ms_refresh_token")).toEqual({
      value: "new-refresh",
    });
  });

  test("returns null and does not store malformed refresh responses", async () => {
    const db = makeDb();
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_access_token", "old-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_refresh_token", "refresh-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_token_expires_at", "1");

    const token = await acquireMsCliToken(db, {
      now: () => 1_000_000,
      fetch: async () => new Response(JSON.stringify({ access_token: "new-token", expires_in: 0 }), { status: 200 }),
    });

    expect(token).toBeNull();
    expect(db.query("SELECT value FROM user_settings WHERE key = ?").get("ms_access_token")).toEqual({
      value: "old-token",
    });
  });

  test("returns null and does not store failed refresh responses", async () => {
    const db = makeDb();
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_access_token", "old-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_refresh_token", "refresh-token");
    db.query("INSERT INTO user_settings (key, value) VALUES (?, ?)").run("ms_token_expires_at", "1");

    const token = await acquireMsCliToken(db, {
      now: () => 1_000_000,
      fetch: async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    });

    expect(token).toBeNull();
    expect(db.query("SELECT value FROM user_settings WHERE key = ?").get("ms_access_token")).toEqual({
      value: "old-token",
    });
  });
});
