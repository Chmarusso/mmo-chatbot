import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrCreateProfile = vi.fn();
const profileFindUnique = vi.fn();
const swipeUpsert = vi.fn();
const swipeFindUnique = vi.fn();
const matchFindUnique = vi.fn();
const matchCreate = vi.fn();
const messageFindMany = vi.fn();
const messageCreate = vi.fn();

vi.mock('@/lib/profile', () => ({
  getOrCreateProfile,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: {
      findUnique: profileFindUnique,
    },
    swipe: {
      upsert: swipeUpsert,
      findUnique: swipeFindUnique,
    },
    match: {
      findUnique: matchFindUnique,
      create: matchCreate,
    },
    message: {
      findMany: messageFindMany,
      create: messageCreate,
    },
  },
}));

const { POST: swipePost } = await import('@/app/api/swipes/route');
const { GET: messagesGet, POST: messagesPost } = await import('@/app/api/messages/[matchId]/route');

const resetMocks = () => {
  getOrCreateProfile.mockReset();
  profileFindUnique.mockReset();
  swipeUpsert.mockReset();
  swipeFindUnique.mockReset();
  matchFindUnique.mockReset();
  matchCreate.mockReset();
  messageFindMany.mockReset();
  messageCreate.mockReset();
};

const buildRequest = (url: string, body: unknown, method: string = 'POST') =>
  new Request(`http://localhost${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

describe('matching flow API', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('creates an active match when swipes are mutual yes', async () => {
    getOrCreateProfile.mockResolvedValue({
      id: 'profileA',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    profileFindUnique.mockResolvedValue({
      id: 'profileB',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    swipeUpsert.mockResolvedValue({});
    swipeFindUnique.mockResolvedValue({ direction: 'YES' });
    matchFindUnique.mockResolvedValue(null);
    matchCreate.mockResolvedValue({
      id: 'match123',
      status: 'ACTIVE',
      requiresGuardianApproval: false,
    });

    const response = await swipePost(
      buildRequest('/api/swipes', { swipedId: 'profileB', direction: 'yes' })
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(payload).toMatchObject({
      success: true,
      matched: true,
      matchId: 'match123',
      requiresApproval: false,
      matchStatus: 'ACTIVE',
    });
    expect(matchCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user1Id: 'profileA',
          user2Id: 'profileB',
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('does not create a match when reciprocal swipe is not yes', async () => {
    getOrCreateProfile.mockResolvedValue({
      id: 'profileA',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    profileFindUnique.mockResolvedValue({
      id: 'profileB',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    swipeUpsert.mockResolvedValue({});
    swipeFindUnique.mockResolvedValue({ direction: 'NO' });

    const response = await swipePost(
      buildRequest('/api/swipes', { swipedId: 'profileB', direction: 'yes' })
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(payload).toMatchObject({
      success: true,
      matched: false,
      matchId: null,
    });
    expect(matchCreate).not.toHaveBeenCalled();
  });
});

describe('conversation API', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns messages for an active match participant', async () => {
    const now = new Date();
    getOrCreateProfile.mockResolvedValue({
      id: 'profileA',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    matchFindUnique.mockResolvedValue({
      id: 'match123',
      status: 'ACTIVE',
      requiresGuardianApproval: false,
      user1Id: 'profileA',
      user2Id: 'profileB',
      user1: { guardianProfileId: null },
      user2: { guardianProfileId: null },
    });
    messageFindMany.mockResolvedValue([
      {
        id: 'message1',
        matchId: 'match123',
        senderId: 'profileB',
        content: 'Ready to raid?',
        createdAt: now,
        sender: { id: 'profileB', isShadowbanned: false },
      },
    ]);

    const response = await messagesGet(
      new Request('http://localhost/api/messages/match123'),
      { params: Promise.resolve({ matchId: 'match123' }) }
    );

    const payload = (await response.json()) as { messages: Array<Record<string, unknown>> };

    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0]).toMatchObject({
      content: 'Ready to raid?',
      senderId: 'profileB',
      matchId: 'match123',
    });
  });

  it('allows a participant to post a new message for an active match', async () => {
    const now = new Date();
    getOrCreateProfile.mockResolvedValue({
      id: 'profileA',
      isChild: false,
      guardianProfileId: null,
      inviteCode: 'INVITE-TEST',
      gamePreferences: [],
      timeSlots: [],
    });
    matchFindUnique.mockResolvedValue({
      id: 'match123',
      status: 'ACTIVE',
      requiresGuardianApproval: false,
      user1Id: 'profileA',
      user2Id: 'profileB',
      user1: { guardianProfileId: null },
      user2: { guardianProfileId: null },
    });
    messageCreate.mockResolvedValue({
      id: 'message2',
      matchId: 'match123',
      senderId: 'profileA',
      content: 'See you in the dungeon!',
      createdAt: now,
    });

    const response = await messagesPost(
      buildRequest('/api/messages/match123', { content: 'See you in the dungeon!' }),
      { params: Promise.resolve({ matchId: 'match123' }) }
    );

    const payload = (await response.json()) as { message: Record<string, unknown> };

    expect(payload.message).toMatchObject({
      content: 'See you in the dungeon!',
      senderId: 'profileA',
      matchId: 'match123',
    });
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchId: 'match123',
          senderId: 'profileA',
          content: 'See you in the dungeon!',
        }),
      })
    );
  });
});
