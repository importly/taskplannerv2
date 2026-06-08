import { describe, expect, test } from "bun:test";
import { parseTaskCliArgs } from "../cli/taskCliParser";

describe("parseTaskCliArgs", () => {
  test("parses add command with list, due date, body, and goal", () => {
    expect(
      parseTaskCliArgs([
        "add",
        "CUDA reading",
        "--list",
        "Inbox",
        "--due",
        "tomorrow",
        "--body",
        "Chapter 4",
        "--goal",
        "ML Systems",
      ]),
    ).toEqual({
      command: "add",
      title: "CUDA reading",
      list: "Inbox",
      due: "tomorrow",
      body: "Chapter 4",
      goal: "ML Systems",
    });
  });

  test("parses list filters and cached mode", () => {
    expect(parseTaskCliArgs(["list", "--cached", "--all", "--due", "today", "--goal", "ML Systems"])).toEqual({
      command: "list",
      cached: true,
      all: true,
      due: "today",
      goal: "ML Systems",
    });
  });

  test("parses mutation commands", () => {
    expect(parseTaskCliArgs(["sync"])).toEqual({ command: "sync" });
    expect(parseTaskCliArgs(["edit", "a81f2c", "--title", "New title", "--due", "2026-06-10"])).toEqual({
      command: "edit",
      ref: "a81f2c",
      title: "New title",
      due: "2026-06-10",
    });
    expect(parseTaskCliArgs(["done", "a81f2c"])).toEqual({ command: "done", ref: "a81f2c" });
    expect(parseTaskCliArgs(["delete", "a81f2c"])).toEqual({ command: "delete", ref: "a81f2c" });
    expect(parseTaskCliArgs(["link", "a81f2c", "ML Systems"])).toEqual({
      command: "link",
      ref: "a81f2c",
      goal: "ML Systems",
    });
    expect(parseTaskCliArgs(["unlink", "a81f2c"])).toEqual({ command: "unlink", ref: "a81f2c" });
    expect(parseTaskCliArgs(["help"])).toEqual({ command: "help" });
  });

  test("rejects unknown commands", () => {
    expect(() => parseTaskCliArgs(["wat"])).toThrow('Unknown task command "wat".');
  });

  test("rejects missing required values", () => {
    expect(() => parseTaskCliArgs(["add"])).toThrow("Missing task title.");
    expect(() => parseTaskCliArgs(["edit"])).toThrow("Missing task reference.");
    expect(() => parseTaskCliArgs(["done"])).toThrow("Missing task reference.");
    expect(() => parseTaskCliArgs(["delete"])).toThrow("Missing task reference.");
    expect(() => parseTaskCliArgs(["unlink"])).toThrow("Missing task reference.");
    expect(() => parseTaskCliArgs(["link", "a81f2c"])).toThrow("Missing goal reference.");
  });

  test("rejects missing flag values", () => {
    expect(() => parseTaskCliArgs(["list", "--due"])).toThrow("Missing value for --due.");
    expect(() => parseTaskCliArgs(["add", "CUDA reading", "--body", "--goal", "ML Systems"])).toThrow(
      "Missing value for --body.",
    );
    expect(() => parseTaskCliArgs(["edit", "a81f2c", "--title"])).toThrow("Missing value for --title.");
  });

  test("rejects unknown flags", () => {
    expect(() => parseTaskCliArgs(["list", "--wat"])).toThrow("Unknown flag --wat.");
    expect(() => parseTaskCliArgs(["done", "abc", "--due", "today"])).toThrow("Unknown flag --due.");
  });

  test("rejects unsupported extra positional arguments", () => {
    expect(() => parseTaskCliArgs(["sync", "now"])).toThrow("Unexpected argument now.");
    expect(() => parseTaskCliArgs(["add", "Title", "unexpected"])).toThrow("Unexpected argument unexpected.");
  });

  test("rejects duplicate value flags including malformed trailing duplicates", () => {
    expect(() => parseTaskCliArgs(["list", "--due", "today", "--due"])).toThrow("Duplicate flag --due.");
    expect(() => parseTaskCliArgs(["edit", "abc", "--title", "A", "--title", "B"])).toThrow(
      "Duplicate flag --title.",
    );
  });
});
