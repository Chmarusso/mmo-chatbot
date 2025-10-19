import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const COMMENT_HEADER = `# Disposable email domains sourced from:
# - https://github.com/disposable-email-domains/disposable-email-domains
# - https://github.com/wesbos/burner-email-providers
# Generated at ${new Date().toISOString()}
# This file is auto-generated; run \`pnpm update:disposable-emails\` to refresh it.
`;

const DATA_RELATIVE_PATH = ["lib", "data", "disposable-email-domains.txt"];

const TEXT_SOURCES = [
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_domains.txt",
];

const JSON_SOURCES = [
  "https://raw.githubusercontent.com/wesbos/burner-email-providers/master/providers.json",
];

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function buildDomainSet(): Promise<Set<string>> {
  const domains = new Set<string>();

  await Promise.all(
    TEXT_SOURCES.map(async (url) => {
      const body = await fetchText(url);
      body
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => !!line && !line.startsWith("#") && !line.startsWith("//"))
        .forEach((line) => domains.add(line));
    }),
  );

  await Promise.all(
    JSON_SOURCES.map(async (url) => {
      const payload = await fetchJson<unknown>(url);

      if (Array.isArray(payload)) {
        payload
          .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
          .filter(Boolean)
          .forEach((entry) => domains.add(entry));
        return;
      }

      if (payload && typeof payload === "object") {
        Object.values(payload as Record<string, unknown>).forEach((value) => {
          if (Array.isArray(value)) {
            value
              .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
              .filter(Boolean)
              .forEach((entry) => domains.add(entry));
            return;
          }

          if (typeof value === "string") {
            const clean = value.trim().toLowerCase();
            if (clean) {
              domains.add(clean);
            }
          }
        });
      }
    }),
  );

  return domains;
}

async function ensureDataDirectory(destination: string) {
  const dir = path.dirname(destination);
  await mkdir(dir, { recursive: true });
}

async function main() {
  const destination = path.join(process.cwd(), ...DATA_RELATIVE_PATH);
  await ensureDataDirectory(destination);

  const domains = await buildDomainSet();
  const sorted = Array.from(domains).sort();

  const body = `${COMMENT_HEADER}${sorted.join("\n")}\n`;
  await writeFile(destination, body, "utf8");

  const count = sorted.length;
  console.log(`Disposable email list updated with ${count} entries.`);
}

main().catch(async (error) => {
  console.error("Failed to update disposable email list:", error instanceof Error ? error.message : error);
  const destination = path.join(process.cwd(), ...DATA_RELATIVE_PATH);

  try {
    const existing = await readFile(destination, "utf8");
    console.error(`Keeping existing list at ${destination} with ${existing.split(/\r?\n/).filter(Boolean).length} entries.`);
  } catch {
    console.error("No existing list found; create the file manually.");
  }
  process.exitCode = 1;
});
