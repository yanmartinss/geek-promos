import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Updates existing KEY=VALUE lines in place, appends any keys not already present. */
export function upsertEnvFile(path: string, updates: Record<string, string>): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing.length > 0 ? existing.split(/\r?\n/) : [];
  const seen = new Set<string>();

  const updatedLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)\s*=/i);
    if (!match) return line;

    const key = match[1]!;
    if (!(key in updates)) return line;

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) updatedLines.push(`${key}=${value}`);
  }

  writeFileSync(path, updatedLines.join("\n"));
}
