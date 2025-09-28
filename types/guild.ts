export type GuildRole = 'OWNER' | 'OFFICER' | 'MEMBER';

export interface GuildSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerId: string;
  creationCodeId: string;
  createdAt: string;
  updatedAt: string;
  membershipId?: string;
  role?: GuildRole;
  memberCount?: number;
  nickname?: string | null;
}

export interface GuildMessage {
  id: string;
  guildId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface GuildCreationCode {
  id: string;
  code: string;
  expiresAt: string;
  redeemedAt: string | null;
  redeemedByProfileId: string | null;
  status: 'pending_payment' | 'available' | 'redeemed' | 'expired';
}

export interface GuildQrInvite {
  id: string;
  guildId: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  createdById: string | null;
  status: 'active' | 'expired';
}

export type GuildEventLocationType = 'ONLINE' | 'OFFLINE';
export type GuildEventAlertChannel = 'EMAIL' | 'SMS' | 'DISCORD' | 'TELEGRAM';

export interface GuildEvent {
  id: string;
  guildId: string;
  title: string;
  description: string | null;
  locationType: GuildEventLocationType;
  locationDetail: string | null;
  startsAt: string;
  imageUrl: string | null;
  createdByProfileId: string;
  createdAt: string;
  updatedAt: string;
  alerts: GuildEventAlert[];
}

export interface GuildEventAlert {
  id: string;
  eventId: string;
  profileId: string;
  channel: GuildEventAlertChannel;
  createdAt: string;
}
