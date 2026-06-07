import { describe, expect, test } from "bun:test";

const SOURCE_ROOTS = ["src"];
const EXTRA_FILES = ["src-tauri/src/phone_view.html"];
const ALLOWED_TIMER_FONT_FILES = new Set(["src/index.css", "src-tauri/src/phone_view.html"]);
const DISALLOWED_LEGACY_FONT_PATTERNS = [
  /font(?:-family|Family)\s*[:=]\s*["'`][^"'`]*(?:Inter|Avenir|Helvetica)/,
  /@import[^;]*(?:Inter|Avenir|Helvetica)/,
  /fonts\.googleapis\.com[^"'`]*(?:Inter|Avenir|Helvetica)/,
];

async function sourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of new Bun.Glob(`${root}/**/*.{ts,tsx,css}`).scan(".")) {
    files.push(entry.replaceAll("\\", "/"));
  }
  return files;
}

describe("typography", () => {
  test("uses Geist for UI and reserves JetBrains Mono for timer digit styling", async () => {
    const files = [...(await Promise.all(SOURCE_ROOTS.map(sourceFiles))).flat(), ...EXTRA_FILES];

    for (const file of files) {
      const source = await Bun.file(file).text();

      if (!ALLOWED_TIMER_FONT_FILES.has(file)) {
        expect(source, file).not.toContain("JetBrains Mono");
      }
      expect(source, file).not.toContain("font-mono");
      expect(source, file).not.toContain("monospace");
      expect(source, file).not.toContain("system-ui");
      for (const pattern of DISALLOWED_LEGACY_FONT_PATTERNS) {
        expect(source, file).not.toMatch(pattern);
      }
    }

    const css = await Bun.file("src/index.css").text();
    expect(css).toContain("--font-timer");
    expect(css).not.toContain("--font-mono");
  });
});
