import { getDb } from "../db";
import { open } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";

const CLIENT_ID = "4b5d7319-2bd1-4c24-904c-f6ffd4c1dc40";
const TENANT_ID = "common"; // supports both personal and work/school accounts
const REDIRECT_URI = "accountability://ms-callback";
const SCOPES = "User.Read Tasks.ReadWrite offline_access";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function startMsAuth() {
  const db = getDb();
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  await db
    .insertInto("user_settings")
    .values({ key: "ms_pkce_verifier", value: verifier })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: verifier }))
    .execute();

  const url = new URL(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`
  );
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("response_mode", "query");

  await open(url.toString());
}

export async function exchangeMsCodeForToken(code: string) {
  const db = getDb();
  const row = await db
    .selectFrom("user_settings")
    .select("value")
    .where("key", "=", "ms_pkce_verifier")
    .executeTakeFirst();

  if (!row) throw new Error("No code verifier found. Start auth flow first.");
  const responseText = await invoke<string>("exchange_ms_token", {
    code,
    codeVerifier: row.value,
    redirectUri: REDIRECT_URI,
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    scope: SCOPES,
  });

  const data = JSON.parse(responseText);
  if (!data.access_token) throw new Error(data.error_description || "Token exchange failed");

  await storeMsTokens(data.access_token, data.refresh_token, data.expires_in);

  await db.deleteFrom("user_settings").where("key", "=", "ms_pkce_verifier").execute();

  return data;
}

async function storeMsTokens(
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number
) {
  const db = getDb();
  const expiresAt = Date.now() + expiresIn * 1000;

  await db
    .insertInto("user_settings")
    .values({ key: "ms_access_token", value: accessToken })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: accessToken }))
    .execute();

  if (refreshToken) {
    await db
      .insertInto("user_settings")
      .values({ key: "ms_refresh_token", value: refreshToken })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: refreshToken }))
      .execute();
  }

  await db
    .insertInto("user_settings")
    .values({ key: "ms_token_expires_at", value: expiresAt.toString() })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: expiresAt.toString() }))
    .execute();
}

async function refreshMsToken(refreshToken: string): Promise<string> {
  const responseText = await invoke<string>("refresh_ms_token", {
    refreshToken,
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    scope: SCOPES,
  });

  const data = JSON.parse(responseText);
  if (!data.access_token) throw new Error(data.error_description || "Token refresh failed");

  await storeMsTokens(data.access_token, data.refresh_token, data.expires_in);
  return data.access_token;
}

export async function acquireMsToken(): Promise<string | null> {
  const db = getDb();

  const settings = await db
    .selectFrom("user_settings")
    .select(["key", "value"])
    .where("key", "in", ["ms_access_token", "ms_refresh_token", "ms_token_expires_at"])
    .execute();

  const accessToken = settings.find((s) => s.key === "ms_access_token")?.value;
  const refreshToken = settings.find((s) => s.key === "ms_refresh_token")?.value;
  const expiresAt = settings.find((s) => s.key === "ms_token_expires_at")?.value;

  if (!accessToken || !expiresAt) return null;
  if (Date.now() < parseInt(expiresAt) - 60000) return accessToken;

  if (refreshToken) {
    try {
      return await refreshMsToken(refreshToken);
    } catch {
      return null;
    }
  }

  return null;
}

export async function disconnectMs() {
  const db = getDb();
  await db
    .deleteFrom("user_settings")
    .where("key", "in", ["ms_access_token", "ms_refresh_token", "ms_token_expires_at"])
    .execute();
}
