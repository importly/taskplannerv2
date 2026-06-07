import { describe, expect, test } from "bun:test";

describe("settings UI", () => {
  test("uses a wrapping tag creation layout instead of a fixed four-column grid", async () => {
    const source = await Bun.file("src/components/settings/TagManager.tsx").text();

    expect(source).not.toContain('gridTemplateColumns: "1fr 1fr auto auto"');
    expect(source).toContain("repeat(auto-fit");
  });

  test("phone view asks backend for dynamic network URLs", async () => {
    const source = await Bun.file("src/components/settings/PhoneViewPanel.tsx").text();

    expect(source).toContain("get_phone_view_urls");
    expect(source).toContain("PhoneViewUrl");
  });
});
