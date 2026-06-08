import path from "node:path";

const APP_DIR = "com.aryan.accountability";
const DB_FILE = "accountability.db";

export type DbPathEnv = Partial<Record<"ACCOUNTABILITY_DB_PATH" | "APPDATA" | "XDG_CONFIG_HOME", string | undefined>>;
export type DbPathPlatform = "win32" | "darwin" | "linux" | NodeJS.Platform;

export function resolveAppDbPath(env: DbPathEnv, platform: DbPathPlatform, homeDir: string): string {
  const override = env.ACCOUNTABILITY_DB_PATH?.trim();
  if (override) return override;

  if (platform === "win32") {
    const appData = env.APPDATA?.trim() || path.win32.join(homeDir, "AppData", "Roaming");
    return path.win32.join(appData, APP_DIR, DB_FILE);
  }

  if (platform === "darwin") {
    return path.posix.join(homeDir, "Library", "Application Support", APP_DIR, DB_FILE);
  }

  const configHome = env.XDG_CONFIG_HOME?.trim() || path.posix.join(homeDir, ".config");
  return path.posix.join(configHome, APP_DIR, DB_FILE);
}
