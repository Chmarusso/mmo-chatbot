import path from "node:path";
import { readFileSync } from "node:fs";

const FALLBACK_DOMAINS = [
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minutemail.co.uk",
  "10minutesmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "temp-mail.com",
  "temp-mail.net",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "tempmailo.com",
  "tempmailo.net",
  "tempmailo.org",
  "tempmailo.xyz",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.info",
  "sharklasers.com",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "maildrop.cc",
  "maildrop.cf",
  "maildrop.ga",
  "maildrop.gq",
  "maildrop.ml",
  "maildrop.tk",
  "mailcatch.com",
  "mailcatch.net",
  "mailnesia.com",
  "mailtothis.com",
  "mailtothis.org",
  "mailtrash.net",
  "mailtrashbox.com",
  "mohmal.com",
  "mohmal.in",
  "mohmal.im",
  "mohmal.tech",
  "moakt.com",
  "moakt.co",
  "moakt.net",
  "moakt.cc",
  "moakt.ws",
  "my10minutemail.com",
  "mytrashmail.com",
  "nada.email",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "yopmail.org",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "trashmail.org",
  "trashmail.ws",
  "trashmail.me",
  "trashmailbox.com",
  "trashmailer.com",
  "trashmailers.com",
  "trashmails.com",
  "trashmail.se",
  "trbvm.com",
  "throwawaymail.com",
  "throwawaymail.net",
  "throwawaymail.org",
  "discard.email",
  "discardmail.com",
  "dispostable.com",
  "spam4.me",
  "spambog.com",
  "spambog.de",
  "spambog.net",
  "spambog.ru",
  "spambox.info",
  "spambox.me",
  "spambox.org",
  "spambox.us",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
];

const DATA_FILE_PATH = path.join(
  process.cwd(),
  "lib",
  "data",
  "disposable-email-domains.txt",
);

let cachedDomains: Set<string> | null = null;
let fileMissingLogged = false;

const normalizeDomain = (value: string) => value.trim().toLowerCase();

function readDomainsFile(): string[] {
  try {
    const contents = readFileSync(DATA_FILE_PATH, "utf8");
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("#") &&
          !line.startsWith("//"),
      );
  } catch (error) {
    if (!fileMissingLogged) {
      fileMissingLogged = true;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(
          "[disposable-email] Failed to read disposable email domain list:",
          error,
        );
      }
    }
    return [];
  }
}

export function getDisposableDomainSet(): Set<string> {
  if (!cachedDomains) {
    const combined = new Set<string>(
      FALLBACK_DOMAINS.map((domain) => normalizeDomain(domain)),
    );

    readDomainsFile()
      .map(normalizeDomain)
      .forEach((domain) => {
        combined.add(domain);
      });

    cachedDomains = combined;
  }

  return cachedDomains;
}

export function isDisposableEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  if (atIndex === -1 || atIndex === email.length - 1) {
    return false;
  }

  const domain = normalizeDomain(email.slice(atIndex + 1));
  const domainSet = getDisposableDomainSet();

  if (domainSet.has(domain)) {
    return true;
  }

  // Check parent domains (e.g. sub.mailinator.com -> mailinator.com)
  const parts = domain.split(".");
  while (parts.length > 2) {
    parts.shift();
    const candidate = parts.join(".");
    if (domainSet.has(candidate)) {
      return true;
    }
  }

  return false;
}

export class DisposableEmailError extends Error {
  constructor(message = "Disposable or temporary email addresses are not allowed") {
    super(message);
    this.name = "DisposableEmailError";
  }
}
