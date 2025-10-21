import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrCreateProfile = vi.fn();
const serializeProfile = vi.fn((profile: any, user: any) => ({
  id: profile.id,
  userId: profile.userId,
  email: user.email,
  inviteCode: profile.inviteCode,
}));

const inviteCodeFindUnique = vi.fn();
const txProfileUpdate = vi.fn();
const txInviteCodeUsageCreate = vi.fn();
const txInviteCodeUpdate = vi.fn();
const txAnalyticsEventCreate = vi.fn();

const transactionMock = vi.fn(async (callback: any) =>
  await callback({
    profile: {
      update: txProfileUpdate,
    },
    inviteCodeUsage: {
      create: txInviteCodeUsageCreate,
    },
    inviteCode: {
      update: txInviteCodeUpdate,
    },
    analyticsEvent: {
      create: txAnalyticsEventCreate,
    },
  })
);

vi.mock('@/lib/profile', () => ({
  getOrCreateProfile,
  serializeProfile,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inviteCode: {
      findUnique: inviteCodeFindUnique,
    },
    $transaction: transactionMock,
  },
}));

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const { PUT: profilePut } = await import('@/app/api/profile/route');

const baseProfile = (overrides: Partial<any> = {}) => ({
  id: 'profile-one',
  userId: 'user-one',
  name: 'Pilot One',
  bio: null,
  twitterLink: null,
  redditLink: null,
  gamePref: null,
  gamePreferences: [],
  timeSlot: null,
  timeSlots: [],
  language: null,
  playstyle: null,
  avatarUrl: null,
  theme: null,
  inviteCode: null,
  notifyOnNewMatch: true,
  notifyOnNewMessage: true,
  notifyOnAnnouncements: true,
  ...overrides,
});

describe('profile invite codes', () => {
  beforeEach(() => {
    getOrCreateProfile.mockReset();
    serializeProfile.mockClear();
    inviteCodeFindUnique.mockReset();
    txProfileUpdate.mockReset();
    txInviteCodeUsageCreate.mockReset();
    txInviteCodeUpdate.mockReset();
    txAnalyticsEventCreate.mockReset();
    transactionMock.mockClear();
  });

  it('allows multi-use invite codes to be applied by different profiles', async () => {
    const profileOne = baseProfile();
    const profileTwo = baseProfile({
      id: 'profile-two',
      userId: 'user-two',
      name: 'Pilot Two',
    });

    getOrCreateProfile
      .mockResolvedValueOnce(profileOne)
      .mockResolvedValueOnce(profileTwo);

    inviteCodeFindUnique
      .mockResolvedValueOnce({
        id: 'invite-code-id',
        code: 'INVITE-ABCD2',
        maxUses: 3,
        usageCount: 0,
        claimedByProfileId: null,
        usageLogs: [],
      })
      .mockResolvedValueOnce({
        id: 'invite-code-id',
        code: 'INVITE-ABCD2',
        maxUses: 3,
        usageCount: 1,
        claimedByProfileId: profileOne.id,
        usageLogs: [],
      });

    txProfileUpdate.mockImplementation(async ({ where, data }: any) => {
      const currentProfile =
        where.id === profileOne.id ? profileOne : profileTwo;

      const normalizeSet = (value: any, fallback: any) =>
        value && typeof value === 'object' && 'set' in value ? value.set : value ?? fallback;

      const updatedProfile = {
        ...currentProfile,
        ...data,
        gamePreferences: normalizeSet(data.gamePreferences, currentProfile.gamePreferences),
        timeSlots: normalizeSet(data.timeSlots, currentProfile.timeSlots),
      };

      Object.assign(currentProfile, updatedProfile);

      return {
        ...updatedProfile,
        user: { id: currentProfile.userId, email: `${currentProfile.userId}@example.com` },
      };
    });

    txInviteCodeUsageCreate.mockResolvedValue(undefined);
    txInviteCodeUpdate.mockResolvedValue(undefined);
    txAnalyticsEventCreate.mockResolvedValue(undefined);

    const firstResponse = await profilePut(buildRequest({ inviteCode: 'INVITE-ABCD2' }));
    expect(firstResponse.status).toBe(200);

    const secondResponse = await profilePut(buildRequest({ inviteCode: 'INVITE-ABCD2' }));
    expect(secondResponse.status).toBe(200);

    expect(txInviteCodeUsageCreate).toHaveBeenCalledTimes(2);
    expect(txInviteCodeUsageCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ profileId: profileOne.id }),
      })
    );
    expect(txInviteCodeUsageCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ profileId: profileTwo.id }),
      })
    );

    expect(txInviteCodeUpdate).toHaveBeenCalledTimes(2);
    expect(txInviteCodeUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          usageCount: { increment: 1 },
        }),
      })
    );
    expect(txInviteCodeUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          usageCount: { increment: 1 },
        }),
      })
    );
  });
});
