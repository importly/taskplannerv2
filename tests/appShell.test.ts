import { describe, expect, test } from "bun:test";

describe("app shell navigation", () => {
  test("does not expose the removed weekly review board", async () => {
    const source = await Bun.file("src/App.tsx").text();

    expect(source).not.toContain('const Review = lazy(() => import("./pages/Review"))');
    expect(source).not.toContain('"review"');
    expect(source).not.toContain("page === \"review\"");
    expect(await Bun.file("src/pages/Review.tsx").exists()).toBe(false);
  });
});
