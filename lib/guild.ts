import crypto from "crypto";
import type {
  Guild as PrismaGuild,
  GuildMembership as PrismaGuildMembership,
  GuildMessage as PrismaGuildMessage,
  GuildCreationCode as PrismaGuildCreationCode,
  GuildCreationPayment,
  GuildQrInvite as PrismaGuildQrInvite,
  GuildEvent as PrismaGuildEvent,
  GuildEventAlert as PrismaGuildEventAlert,
} from "@prisma/client";
import type {
  GuildSummary,
  GuildRole,
  GuildMessage,
  GuildCreationCode,
  GuildQrInvite,
  GuildEvent,
  GuildEventAlert,
} from "@/types/guild";

export const generateInviteCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

export const serializeGuild = (
  guild: PrismaGuild,
  membership?: PrismaGuildMembership | null,
  memberCount?: number
): GuildSummary => ({
  id: guild.id,
  name: guild.name,
  description: guild.description ?? null,
  inviteCode: guild.inviteCode,
  ownerId: guild.ownerId,
  creationCodeId: guild.creationCodeId,
  createdAt: guild.createdAt.toISOString(),
  updatedAt: guild.updatedAt.toISOString(),
  membershipId: membership?.id,
  role: membership?.role as GuildRole | undefined,
  memberCount,
  nickname: membership?.nickname ?? null,
});

export const serializeGuildMessage = (message: PrismaGuildMessage): GuildMessage => ({
  id: message.id,
  guildId: message.guildId,
  senderId: message.senderId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
});

export const getGuildCodeStatus = (
  code: PrismaGuildCreationCode & { payment?: { status: string | null } | null }
): GuildCreationCode['status'] => {
  if (code.redeemedAt) return 'redeemed';
  if (code.expiresAt.getTime() <= Date.now()) return 'expired';
  if (!code.payment || code.payment.status !== "CONFIRMED") return 'pending_payment';
  return 'available';
};

export const serializeCreationCode = (
  code: PrismaGuildCreationCode & { payment?: { status: string | null } | null }
): GuildCreationCode => ({
  id: code.id,
  code: code.code,
  expiresAt: code.expiresAt.toISOString(),
  redeemedAt: code.redeemedAt?.toISOString() ?? null,
  redeemedByProfileId: code.redeemedByProfileId ?? null,
  status: getGuildCodeStatus(code),
});

export const isCodeRedeemable = (
  code: PrismaGuildCreationCode & { payment?: GuildCreationPayment | null }
) => {
  if (code.redeemedAt) {
    return false;
  }
  if (code.expiresAt.getTime() <= Date.now()) {
    return false;
  }
  if (!code.payment || code.payment.status !== "CONFIRMED") {
    return false;
  }
  return true;
};

export const serializeQrInvite = (invite: PrismaGuildQrInvite): GuildQrInvite => ({
  id: invite.id,
  guildId: invite.guildId,
  code: invite.code,
  expiresAt: invite.expiresAt.toISOString(),
  createdAt: invite.createdAt.toISOString(),
  createdById: invite.createdById ?? null,
  status: invite.expiresAt.getTime() <= Date.now() ? "expired" : "active",
});

export const serializeGuildEventAlert = (alert: PrismaGuildEventAlert): GuildEventAlert => ({
  id: alert.id,
  eventId: alert.eventId,
  profileId: alert.profileId,
  channel: alert.channel,
  createdAt: alert.createdAt.toISOString(),
});

export const serializeGuildEvent = (
  event: PrismaGuildEvent,
  alerts: PrismaGuildEventAlert[]
): GuildEvent => ({
  id: event.id,
  guildId: event.guildId,
  title: event.title,
  description: event.description ?? null,
  locationType: event.locationType,
  locationDetail: event.locationDetail ?? null,
  startsAt: event.startsAt.toISOString(),
  imageUrl: event.imageUrl ?? null,
  createdByProfileId: event.createdByProfileId,
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString(),
  alerts: alerts.map(serializeGuildEventAlert),
});
