import { getDb } from "../db";
import { open } from "@tauri-apps/plugin-shell";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = "accountability://oauth/callback";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

let codeVerifier: string | null = null;

/**
 * Generates a random string for PKCE code verifier.
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generates a SHA-256 hash of the code verifier for PKCE code challenge.
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Constructs the Google OAuth URL with PKCE and deep-link redirect.
 */
export async function buildAuthUrl(): Promise<string> {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

/**
 * Starts the Google OAuth flow by opening the browser.
 */
export async function startGoogleAuth() {
  const url = await buildAuthUrl();
  await open(url);
}

/**
 * Exchanges the authorization code for an access token and refresh token.
 */
export async function exchangeCodeForToken(code: string) {
  if (!codeVerifier) {
    throw new Error("No code verifier found. Start the auth flow first.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Failed to exchange code for token");
  }

  await storeTokens(data.access_token, data.refresh_token, data.expires_in);
  codeVerifier = null; // Clear verifier after use
  return data;
}

/**
 * Stores tokens in the user_settings table.
 */
async function storeTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number) {
  const db = getDb();
  const expiresAt = Date.now() + expiresIn * 1000;

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("user_settings")
      .values({ key: "google_access_token", value: accessToken })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: accessToken }))
      .execute();
    
    if (refreshToken) {
      await trx
        .insertInto("user_settings")
        .values({ key: "google_refresh_token", value: refreshToken })
        .onConflict((oc) => oc.column("key").doUpdateSet({ value: refreshToken }))
        .execute();
    }

    await trx
      .insertInto("user_settings")
      .values({ key: "google_token_expires_at", value: expiresAt.toString() })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: expiresAt.toString() }))
      .execute();
  });
}

/**
 * Refreshes the access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Failed to refresh token");
  }

  await storeTokens(data.access_token, data.refresh_token, data.expires_in);
  return data.access_token;
}

/**
 * Acquires a valid Google token, refreshing if necessary.
 */
export async function acquireGoogleToken(): Promise<string | null> {
  const db = getDb();
  
  const settings = await db
    .selectFrom("user_settings")
    .select(["key", "value"])
    .where("key", "in", ["google_access_token", "google_refresh_token", "google_token_expires_at"])
    .execute();

  const accessToken = settings.find((s) => s.key === "google_access_token")?.value;
  const refreshToken = settings.find((s) => s.key === "google_refresh_token")?.value;
  const expiresAt = settings.find((s) => s.key === "google_token_expires_at")?.value;

  if (!accessToken || !expiresAt) {
    return null;
  }

  if (Date.now() < parseInt(expiresAt) - 60000) {
    return accessToken;
  }

  if (refreshToken) {
    try {
      return await refreshAccessToken(refreshToken);
    } catch (error) {
      console.error("Failed to refresh Google token:", error);
      return null;
    }
  }

  return null;
}

/**
 * Disconnects Google account by deleting tokens from user_settings.
 */
export async function disconnect() {
  const db = getDb();
  await db
    .deleteFrom("user_settings")
    .where("key", "in", ["google_access_token", "google_refresh_token", "google_token_expires_at"])
    .execute();
}
