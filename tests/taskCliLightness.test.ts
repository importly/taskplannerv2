import { describe, expect, test } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootPath = fileURLToPath(new URL("../", import.meta.url));
const heavyCliPackages = ["commander", "yargs", "chalk", "ink", "ora", "boxen"];

function filesUnder(dir: string, extensions: string[]): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      result.push(...filesUnder(path, extensions));
    } else if (extensions.some((extension) => path.endsWith(extension))) {
      result.push(path);
    }
  }

  return result;
}

async function fileText(path: string): Promise<string> {
  return Bun.file(path).text();
}

function importSpecifiers(text: string): string[] {
  const specifiers: string[] = [];
  const importFromPattern = /from\s+["']([^"']+)["']/g;
  const sideEffectImportPattern = /import\s+["']([^"']+)["']/g;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [importFromPattern, sideEffectImportPattern, dynamicImportPattern]) {
    for (const match of text.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function importsAny(specifiers: string[], packages: string[]): boolean {
  return specifiers.some((specifier) =>
    packages.some((packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`)),
  );
}

function importsTopLevelCliModule(sourceFile: string, specifier: string): boolean {
  const normalizedSpecifier = specifier.replaceAll("\\", "/");
  if (normalizedSpecifier === "cli" || normalizedSpecifier.startsWith("cli/")) return true;
  if (!normalizedSpecifier.startsWith(".")) return false;

  const resolvedImport = resolve(dirname(sourceFile), specifier);
  const relativeImport = relative(rootPath, resolvedImport).replaceAll("\\", "/");
  return relativeImport === "cli" || relativeImport.startsWith("cli/");
}

describe("task CLI lightness boundaries", () => {
  test("does not add heavyweight CLI UI dependencies", async () => {
    const packageJson = await Bun.file(join(rootPath, "package.json")).json();
    const dependencyNames = new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
      ...Object.keys(packageJson.optionalDependencies ?? {}),
    ]);

    for (const packageName of heavyCliPackages) {
      expect(dependencyNames.has(packageName)).toBe(false);
    }
  });

  test("keeps CLI-only runtime code out of the frontend source tree", async () => {
    const sourceFiles = filesUnder(join(rootPath, "src"), [".ts", ".tsx"]);
    const violations: string[] = [];

    for (const path of sourceFiles) {
      const text = await fileText(path);
      if (
        importSpecifiers(text).some((specifier) => importsTopLevelCliModule(path, specifier)) ||
        /from\s+["']bun:sqlite["']/.test(text) ||
        /taskCli|sqliteTaskRepository|msCliAuth/.test(text)
      ) {
        violations.push(relative(rootPath, path));
      }
    }

    expect(violations).toEqual([]);
  });

  test("keeps CLI files free of frontend and terminal decoration frameworks", async () => {
    const cliFiles = filesUnder(join(rootPath, "cli"), [".ts"]);
    const forbiddenPackages = [
      "@tauri-apps/api",
      "@tauri-apps/plugin-sql",
      "react",
      "react-dom",
      "lucide-react",
      "@tanstack/react-query",
      ...heavyCliPackages,
    ];
    const violations: string[] = [];

    for (const path of cliFiles) {
      const text = await fileText(path);
      if (importsAny(importSpecifiers(text), forbiddenPackages)) {
        violations.push(relative(rootPath, path));
      }
    }

    expect(violations).toEqual([]);
  });

  test("keeps output sanitization ASCII-focused instead of emoji-specific", async () => {
    const formatter = await fileText(join(rootPath, "cli", "taskCliFormat.ts"));

    expect(formatter).not.toMatch(/Emoji|1F300|1FAFF|1F600|1F64F/);
    expect(formatter).toContain("[^\\x00-\\x7F]");
  });
});
