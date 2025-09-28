import type { Badge as PrismaBadge, ProfileBadge } from "@prisma/client";
import type { Badge } from "@/types/badge";

export const serializeBadge = (
  badge: PrismaBadge,
  collection?: ProfileBadge | null
): Badge => ({
  id: badge.id,
  slug: badge.slug,
  name: badge.name,
  description: badge.description ?? null,
  latitude: Number(badge.latitude),
  longitude: Number(badge.longitude),
  radiusMeters: badge.radiusMeters,
  qrRequired: badge.qrRequired,
  createdAt: badge.createdAt.toISOString(),
  updatedAt: badge.updatedAt.toISOString(),
  collectedAt: collection?.collectedAt?.toISOString() ?? null,
});
