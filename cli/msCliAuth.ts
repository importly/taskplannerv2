import { Database } from "bun:sqlite";

const CLIENT_ID = "4b5d7319-2bd1-4c24-904c-f6ffd4c1dc40";
const TENANT_ID = "common";
const SCOPES = "User.Read Tasks.ReadWrite offline_access";
const REFRESH_SKEW_MS = 60_000;

type SqliteDatabase = Pick<Database, "query">;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error_description?: string;
};

function openDatabase(dbOrPath: string | SqliteDatabase): SqliteDatabase {
  return typeof dbOrPath === "string" ? new Database(dbOrPath) : dbOrPath;
}

function getSetting(db: SqliteDatabase, key: string): string | null {
  const row = db.query("SELECT value FROM user_settings WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

function setSetting(db: SqliteDatabase, key: string, value: string): void {
  db.query(
    "INSERT INTO user_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

function storeMsTokens(db: SqliteDatabase, accessToken: string, refreshToken: string | undefined, expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  setSetting(db, "ms_access_token", accessToken);
  if (refreshToken) setSetting(db, "ms_refresh_token", refreshToken);
  setSetting(db, "ms_token_expires_at", expiresAt.toString());
}

async function refreshMsToken(
  db: SqliteDatabase,
  refreshToken: string,
  fetchImpl: FetchLike,
): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES,
  });
  const response = await fetchImpl(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;

  const data = (await response.json()) as TokenResponse;
  if (
    typeof data.access_token !== "string" ||
    data.access_token.length === 0 ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0
  ) {
    return null;
  }

  storeMsTokens(db, data.access_token, data.refresh_token, data.expires_in);
  return data.access_token;
}

export async function acquireMsCliToken(
  dbOrPath: string | SqliteDatabase,
  options: { fetch?: FetchLike; now?: () => number } = {},
): Promise<string | null> {
  const db = openDatabase(dbOrPath);
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  const accessToken = getSetting(db, "ms_access_token");
  const refreshToken = getSetting(db, "ms_refresh_token");
  const expiresAtValue = getSetting(db, "ms_token_expires_at");
  const expiresAt = expiresAtValue ? Number.parseInt(expiresAtValue, 10) : NaN;

  if (accessToken && Number.isFinite(expiresAt) && now() < expiresAt - REFRESH_SKEW_MS) {
    return accessToken;
  }

  if (!refreshToken) return null;

  try {
    return await refreshMsToken(db, refreshToken, fetchImpl);
  } catch {
    return null;
  }
}
