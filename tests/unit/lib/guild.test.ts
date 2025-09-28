import { describe, it, expect } from 'vitest';
import { getGuildCodeStatus, isCodeRedeemable, serializeQrInvite, serializeGuild } from '@/lib/guild';

const baseCode = {
  id: 'code-id',
  code: 'ABC123',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  createdAt: new Date(),
  redeemedAt: null as Date | null,
  redeemedByProfileId: null as string | null,
  createdByProfileId: null as string | null,
};

describe('guild creation code helpers', () => {
  it('marks unpaid codes as pending payment', () => {
    const status = getGuildCodeStatus({ ...baseCode, payment: null } as any);
    expect(status).toBe('pending_payment');
  });

  it('marks codes as available once payment is confirmed', () => {
    const status = getGuildCodeStatus({
      ...baseCode,
      payment: {
        status: 'CONFIRMED',
      },
    } as any);
    expect(status).toBe('available');
  });

  it('marks redeemed codes appropriately', () => {
    const status = getGuildCodeStatus({ ...baseCode, redeemedAt: new Date() });
    expect(status).toBe('redeemed');
  });

  it('is redeemable only when payment is confirmed and not expired', () => {
    const canRedeem = isCodeRedeemable({
      ...baseCode,
      payment: {
        id: 'payment',
        codeId: 'code-id',
        chainId: 1,
        tokenAddress: null,
        payerAddress: '0x'.padEnd(42, '1'),
        amountWei: '1',
        txHash: '0x'.padEnd(66, '2'),
        status: 'CONFIRMED',
        createdAt: new Date(),
        confirmedAt: new Date(),
        payerProfileId: null,
      },
    } as any);
    expect(canRedeem).toBe(true);
  });

  it('prevents redemption when payment is missing', () => {
    const canRedeem = isCodeRedeemable({ ...baseCode, payment: null } as any);
    expect(canRedeem).toBe(false);
  });

  it('prevents redemption once expired', () => {
    const expiredCode = {
      ...baseCode,
      expiresAt: new Date(Date.now() - 1000),
    };
    const canRedeem = isCodeRedeemable({ ...expiredCode, payment: { status: 'CONFIRMED' } } as any);
    expect(canRedeem).toBe(false);
  });

  it('serializes qr invites and marks them expired appropriately', () => {
    const invite = serializeQrInvite({
      id: 'invite',
      guildId: 'guild',
      code: 'CODE1234',
      createdAt: new Date(),
      createdById: null,
      expiresAt: new Date(Date.now() - 1),
    } as any);

    expect(invite).toMatchObject({
      id: 'invite',
      code: 'CODE1234',
      status: 'expired',
    });
  });

  it('serializes guilds with membership nickname data', () => {
    const guild = serializeGuild({
      id: 'guild-id',
      name: 'Guild Name',
      description: 'desc',
      inviteCode: 'INVITE',
      ownerId: 'owner',
      creationCodeId: 'creation-code',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as any, {
      id: 'membership',
      guildId: 'guild-id',
      profileId: 'profile-id',
      role: 'MEMBER',
      nickname: 'ShadowStrider',
    } as any, 5);

    expect(guild).toMatchObject({
      nickname: 'ShadowStrider',
      memberCount: 5,
    });
  });
});
