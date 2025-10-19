import { test, expect } from '@playwright/test';
import { prisma, createOtp, normalizeEmail, APP_URL } from './helpers';

const PROFILE_TEMPLATE = {
  bio: 'Testing automated matching flow.',
  gamePref: 'final_fantasy_xiv',
  timeSlot: 'weekends_evenings',
  language: 'english',
  playstyle: 'casual',
  isVerified: true,
  isChild: false,
  inviteCode: 'TEST123',
} as const;

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('two players can match and start chatting', async ({ browser }) => {
  const timestamp = Date.now();
  const playerOneEmail = `playwright+match-${timestamp}@example.com`;
  const playerTwoEmail = `playwright+partner-${timestamp}@example.com`;
  const playerOneName = 'Match Tester One';
  const playerTwoName = 'Match Tester Two';
  const playerOneOtp = '123456';
  const playerTwoOtp = '987654';

  const cleanup = async () => {
    const emails = [playerOneEmail, playerTwoEmail].map(normalizeEmail);
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const userIds = users.map((user) => user.id);

    if (userIds.length) {
      await prisma.message.deleteMany({ where: { match: { OR: [{ user1Id: { in: userIds } }, { user2Id: { in: userIds } }] } } });
      await prisma.match.deleteMany({ where: { OR: [{ user1Id: { in: userIds } }, { user2Id: { in: userIds } }] } });
      await prisma.swipe.deleteMany({ where: { OR: [{ swiperId: { in: userIds } }, { swipedId: { in: userIds } }] } });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    }

    await prisma.otpToken.deleteMany({ where: { email: { in: emails } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  };

  await cleanup();

  try {
    const [playerOne, playerTwo] = await Promise.all([
      prisma.user.create({
        data: {
          email: normalizeEmail(playerOneEmail),
          profile: {
            create: {
              name: playerOneName,
              ...PROFILE_TEMPLATE,
            },
          },
        },
        include: { profile: true },
      }),
      prisma.user.create({
        data: {
          email: normalizeEmail(playerTwoEmail),
          profile: {
            create: {
              name: playerTwoName,
              ...PROFILE_TEMPLATE,
            },
          },
        },
        include: { profile: true },
      }),
    ]);

    await prisma.swipe.deleteMany({
      where: {
        OR: [
          { swiperId: playerOne.profile?.id },
          { swipedId: playerOne.profile?.id },
          { swiperId: playerTwo.profile?.id },
          { swipedId: playerTwo.profile?.id },
        ],
      },
    });

    await createOtp(playerOneEmail, playerOneOtp);
    await createOtp(playerTwoEmail, playerTwoOtp);

    const contextOne = await browser.newContext();
    const pageOne = await contextOne.newPage();
    await pageOne.goto(
      `${APP_URL}/auth/callback?email=${encodeURIComponent(playerOneEmail)}&code=${playerOneOtp}`
    );
    await pageOne.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });
    await pageOne.waitForLoadState('networkidle');
    await pageOne.goto(`${APP_URL}/dashboard`);
    await expect(pageOne.getByRole('heading', { name: playerTwoName })).toBeVisible();
    const swipeRequestOne = pageOne.waitForResponse(
      (response) => response.url().includes('/api/swipes') && response.request().method() === 'POST'
    );
    await pageOne.getByRole('button', { name: 'Squad Up' }).click();
    await swipeRequestOne;

    const contextTwo = await browser.newContext();
    const pageTwo = await contextTwo.newPage();
    await pageTwo.goto(
      `${APP_URL}/auth/callback?email=${encodeURIComponent(playerTwoEmail)}&code=${playerTwoOtp}`
    );
    await pageTwo.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });
    await pageTwo.waitForLoadState('networkidle');
    await pageTwo.goto(`${APP_URL}/dashboard`);
    await expect(pageTwo.getByRole('heading', { name: playerOneName })).toBeVisible();
    const swipeRequestTwo = pageTwo.waitForResponse(
      (response) => response.url().includes('/api/swipes') && response.request().method() === 'POST'
    );
    await pageTwo.getByRole('button', { name: 'Squad Up' }).click();
    await swipeRequestTwo;

    // Give time for match to be created in database
    await pageTwo.waitForTimeout(1000);

    const swipes = await prisma.swipe.findMany({
      where: {
        OR: [
          { swiperId: playerOne.profile?.id, swipedId: playerTwo.profile?.id },
          { swiperId: playerTwo.profile?.id, swipedId: playerOne.profile?.id },
        ],
      },
    });

    expect(swipes).toHaveLength(2);
    expect(swipes.every(s => s.direction === 'YES')).toBe(true);

    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: playerOne.profile?.id, user2Id: playerTwo.profile?.id },
          { user1Id: playerTwo.profile?.id, user2Id: playerOne.profile?.id },
        ],
      },
    });

    expect(match).toBeTruthy();
    expect(match?.status).toBe('ACTIVE');

    await pageOne.goto(`${APP_URL}/matches`);
    const matchCard = pageOne.getByRole('link', { name: new RegExp(playerTwoName, 'i') });
    await expect(matchCard).toBeVisible();
    await matchCard.click();

    const messageInput = pageOne.getByPlaceholder('Send a message');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Ready to raid?');
    const sendResponse = pageOne.waitForResponse(
      (response) => response.url().includes('/api/messages/') && response.request().method() === 'POST'
    );
    await pageOne.getByRole('button', { name: 'Send' }).click();
    await sendResponse;
    await expect(pageOne.getByText('Ready to raid?').first()).toBeVisible();

    await contextOne.close();
    await contextTwo.close();
  } finally {
    await cleanup();
  }
});
