export type TaskCliCommand =
  | { command: "list"; cached?: boolean; all?: boolean; due?: string; goal?: string }
  | { command: "sync" }
  | { command: "add"; title: string; list?: string; due?: string; body?: string; goal?: string }
  | { command: "edit"; ref: string; title?: string; due?: string; body?: string }
  | { command: "done"; ref: string }
  | { command: "delete"; ref: string }
  | { command: "link"; ref: string; goal: string }
  | { command: "unlink"; ref: string }
  | { command: "help" };

type ParsedArgs = {
  positionals: string[];
  values: Record<string, string | undefined>;
  booleans: Set<string>;
};

type CommandSpec = {
  valueFlags?: string[];
  booleanFlags?: string[];
};

function parseArgs(args: string[], spec: CommandSpec): ParsedArgs {
  const valueFlags = new Set(spec.valueFlags ?? []);
  const booleanFlags = new Set(spec.booleanFlags ?? []);
  const seen = new Set<string>();
  const values: Record<string, string | undefined> = {};
  const booleans = new Set<string>();
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    if (!valueFlags.has(arg) && !booleanFlags.has(arg)) {
      throw new Error(`Unknown flag ${arg}.`);
    }

    if (seen.has(arg)) {
      throw new Error(`Duplicate flag ${arg}.`);
    }
    seen.add(arg);

    if (booleanFlags.has(arg)) {
      booleans.add(arg);
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}.`);
    }

    values[arg] = value;
    index += 1;
  }

  return { positionals, values, booleans };
}

function requireTaskRef(value: string | undefined): string {
  if (!value) throw new Error("Missing task reference.");
  return value;
}

function rejectExtraPositionals(positionals: string[], max: number): void {
  const extra = positionals[max];
  if (extra) throw new Error(`Unexpected argument ${extra}.`);
}

export function parseTaskCliArgs(args: string[]): TaskCliCommand {
  const [command, ...rest] = args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command === "list") {
    const parsed = parseArgs(rest, { booleanFlags: ["--cached", "--all"], valueFlags: ["--due", "--goal"] });
    rejectExtraPositionals(parsed.positionals, 0);
    return {
      command: "list",
      cached: parsed.booleans.has("--cached") || undefined,
      all: parsed.booleans.has("--all") || undefined,
      due: parsed.values["--due"],
      goal: parsed.values["--goal"],
    };
  }

  if (command === "sync") {
    const parsed = parseArgs(rest, {});
    rejectExtraPositionals(parsed.positionals, 0);
    return { command: "sync" };
  }

  if (command === "add") {
    const parsed = parseArgs(rest, { valueFlags: ["--list", "--due", "--body", "--goal"] });
    const [title] = parsed.positionals;
    if (!title) throw new Error("Missing task title.");
    rejectExtraPositionals(parsed.positionals, 1);
    return {
      command: "add",
      title,
      list: parsed.values["--list"],
      due: parsed.values["--due"],
      body: parsed.values["--body"],
      goal: parsed.values["--goal"],
    };
  }

  if (command === "edit") {
    const parsed = parseArgs(rest, { valueFlags: ["--title", "--due", "--body"] });
    rejectExtraPositionals(parsed.positionals, 1);
    return {
      command: "edit",
      ref: requireTaskRef(parsed.positionals[0]),
      title: parsed.values["--title"],
      due: parsed.values["--due"],
      body: parsed.values["--body"],
    };
  }

  if (command === "done" || command === "delete" || command === "unlink") {
    const parsed = parseArgs(rest, {});
    rejectExtraPositionals(parsed.positionals, 1);
    return { command, ref: requireTaskRef(parsed.positionals[0]) };
  }

  if (command === "link") {
    const parsed = parseArgs(rest, {});
    rejectExtraPositionals(parsed.positionals, 2);
    const ref = requireTaskRef(parsed.positionals[0]);
    const goal = parsed.positionals[1];
    if (!goal) throw new Error("Missing goal reference.");
    return { command: "link", ref, goal };
  }

  throw new Error(`Unknown task command "${command}".`);
}
