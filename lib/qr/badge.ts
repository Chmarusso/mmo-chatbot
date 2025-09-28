import crypto from "crypto";

const QR_SECRET_BYTES = 24;

export function generateBadgeQrSecret() {
  return crypto.randomBytes(QR_SECRET_BYTES).toString("hex");
}

export function buildBadgeQrPayload(badgeId: string, secret: string, baseUrl: string) {
  const url = new URL(`/badges/claim/${badgeId}`, baseUrl);
  url.searchParams.set("token", secret);
  return url.toString();
}
