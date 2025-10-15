// This module provides pure utilities and must not be marked as a server action

import crypto from "crypto";

const DEFAULT_PREFIX = "INVITE";
const DEFAULT_LENGTH = 6;
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Basic syntax validation for invite codes to avoid useless DB lookups.
 * Accepts formats like "INVITE-ABC123" (prefix optional, length flexible).
 */
export function isLikelyValidInviteCode(value: string): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeInviteCode(value);
  if (!normalized) return false;
  // Accept PREFIX-CODE where CODE is at least 4 characters from the charset
  const parts = normalized.split("-");
  const codePart = parts.pop() ?? "";
  if (codePart.length < 4) return false;
  return [...codePart].every((ch) => CODE_CHARSET.includes(ch));
}

function randomCode(length: number): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = crypto.randomInt(0, CODE_CHARSET.length);
    output += CODE_CHARSET[randomIndex]!;
  }
  return output;
}

export function generateInviteCode(options?: { prefix?: string; length?: number }): string {
  const prefix = options?.prefix?.trim().toUpperCase() || DEFAULT_PREFIX;
  const length = Number.isInteger(options?.length) && (options?.length ?? 0) > 0 ? Number(options!.length) : DEFAULT_LENGTH;
  return `${prefix}-${randomCode(length)}`;
}
