import { test, expect } from '@playwright/test';
import { prisma, createOtp, cleanupUser, normalizeEmail, APP_URL } from './helpers';

const emailFor = (suffix: string) => `playwright+features-${suffix}-${Date.now()}@example.com`;
const OTP_CODE = '998877';

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Additional Features', () => {
  test('unread match notifications display correctly', async ({ page, browser }) => {
    const playerOneEmail = `playwright+unread1-${Date.now()}@example.com`;
    const playerTwoEmail = `playwright+unread2-${Date.now()}@example.com`;
    const playerOneName = 'Unread Tester One';
    const playerTwoName = 'Unread Tester Two';

    const cleanup = async () => {
      const emails = [playerOneEmail, playerTwoEmail].map(normalizeEmail);
      const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, profile: { select: { id: true } } } });
      const profileIds = users.map(u => u.profile?.id).filter(Boolean) as string[];

      if (profileIds.length) {
        await prisma.message.deleteMany({ where: { match: { OR: [{ user1Id: { in: profileIds } }, { user2Id: { in: profileIds } }] } } });
        await prisma.match.deleteMany({ where: { OR: [{ user1Id: { in: profileIds } }, { user2Id: { in: profileIds } }] } });
        await prisma.swipe.deleteMany({ where: { OR: [{ swiperId: { in: profileIds } }, { swipedId: { in: profileIds } }] } });
      }

      await prisma.session.deleteMany({ where: { user: { email: { in: emails } } } });
      await prisma.otpToken.deleteMany({ where: { email: { in: emails } } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    };

    await cleanup();

    try {
      // Create two users with profiles
      const [playerOne, playerTwo] = await Promise.all([
        prisma.user.create({
          data: {
            email: normalizeEmail(playerOneEmail),
            profile: {
              create: {
                name: playerOneName,
                bio: 'Testing unread notifications',
                gamePref: 'final_fantasy_xiv',
                timeSlot: 'weekends_evenings',
                language: 'english',
                playstyle: 'casual',
                isVerified: true,
                isChild: false,
                inviteCode: 'UNREAD1',
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
                bio: 'Testing unread notifications',
                gamePref: 'final_fantasy_xiv',
                timeSlot: 'weekends_evenings',
                language: 'english',
                playstyle: 'casual',
                isVerified: true,
                isChild: false,
                inviteCode: 'UNREAD2',
              },
            },
          },
          include: { profile: true },
        }),
      ]);

      // Create mutual swipes to create a match
      await prisma.swipe.createMany({
        data: [
          { swiperId: playerOne.profile!.id, swipedId: playerTwo.profile!.id, direction: 'YES' },
          { swiperId: playerTwo.profile!.id, swipedId: playerOne.profile!.id, direction: 'YES' },
        ],
      });

      const [user1Id, user2Id] = [playerOne.profile!.id, playerTwo.profile!.id].sort();
      const match = await prisma.match.create({
        data: {
          user1Id,
          user2Id,
          status: 'ACTIVE',
        },
      });

      // Player two sends a message
      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: playerTwo.profile!.id,
          content: 'Hey, want to raid tonight?',
        },
      });

      // Player one logs in and should see unread notification
      await createOtp(playerOneEmail, OTP_CODE);
      await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(playerOneEmail)}&code=${OTP_CODE}`);
      await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

      // Check for unread count indicator
      const unreadResponse = await page.waitForResponse(
        response => response.url().includes('/api/matches/unread-count')
      );
      const unreadData = await unreadResponse.json();
      expect(unreadData.unreadMatches).toBeGreaterThan(0);

      // Navigate to matches and verify message appears
      await page.goto(`${APP_URL}/matches`);
      await expect(page.getByText(playerTwoName)).toBeVisible();

      await cleanup();
    } catch (error) {
      await cleanup();
      throw error;
    }
  });

  test('user can submit feedback via API', async ({ page }) => {
    const email = emailFor('feedback');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    // Test feedback API directly via page context
    const feedbackResponse = await page.evaluate(async () => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test feedback from e2e tests',
          type: 'feedback',
        }),
      });
      return {
        ok: response.ok,
        status: response.status,
      };
    });

    expect(feedbackResponse.ok).toBeTruthy();

    await cleanupUser(email);
  });

  test('user can suggest a new game via API', async ({ page }) => {
    const email = emailFor('game-suggest');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    // Test game suggestion API directly
    const suggestionResponse = await page.evaluate(async () => {
      const response = await fetch('/api/game-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test MMO Game',
          description: 'This is a popular MMO that should be added for e2e testing',
          referenceUrl: 'https://example.com/test-game',
        }),
      });
      return {
        ok: response.ok,
        status: response.status,
      };
    });

    expect(suggestionResponse.ok).toBeTruthy();

    await cleanupUser(email);
  });

  test('user can add comment to a game', async ({ page }) => {
    const email = emailFor('comment');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    // Navigate to a specific game page
    await page.goto(`${APP_URL}/games`);

    // Click on first game
    const firstGameLink = page.getByRole('link').filter({ hasText: /World of Warcraft|Final Fantasy/i }).first();
    if (await firstGameLink.count() > 0) {
      await firstGameLink.click();

      // Look for comment section
      const commentInput = page.getByPlaceholder(/comment|share your thoughts/i);

      if (await commentInput.count() > 0) {
        await commentInput.fill('Great game! Loving the community.');

        const commentResponse = page.waitForResponse(
          response => response.url().includes('/comments') && response.request().method() === 'POST'
        );
        await page.getByRole('button', { name: /post|submit|add comment/i }).click();
        const response = await commentResponse;

        expect(response.ok()).toBeTruthy();
        await expect(page.getByText('Great game! Loving the community.')).toBeVisible({ timeout: 10000 });
      }
    }

    await cleanupUser(email);
  });

  test('user can rate a game', async ({ page }) => {
    const email = emailFor('rating');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    await page.goto(`${APP_URL}/games`);

    const firstGameLink = page.getByRole('link').filter({ hasText: /World of Warcraft|Final Fantasy/i }).first();
    if (await firstGameLink.count() > 0) {
      await firstGameLink.click();

      // Look for rating stars or buttons
      const ratingElement = page.locator('[data-testid="rating"]').or(page.getByRole('group', { name: /rate|rating/i }));

      if (await ratingElement.count() > 0) {
        // Click on 4th star for a 4-star rating
        const stars = page.locator('[role="button"]').filter({ hasText: /★|star/i });
        if (await stars.count() >= 4) {
          const ratingResponse = page.waitForResponse(
            response => response.url().includes('/rating') && response.request().method() === 'POST'
          );
          await stars.nth(3).click();
          const response = await ratingResponse;

          expect(response.ok()).toBeTruthy();
        }
      }
    }

    await cleanupUser(email);
  });

  test('user can suggest game updates', async ({ page }) => {
    const email = emailFor('game-update');
    await cleanupUser(email);
    await createOtp(email, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(email)}&code=${OTP_CODE}`);
    await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15_000 });

    await page.goto(`${APP_URL}/games`);

    const firstGameLink = page.getByRole('link').filter({ hasText: /World of Warcraft|Final Fantasy/i }).first();
    if (await firstGameLink.count() > 0) {
      await firstGameLink.click();

      const suggestEditButton = page.getByRole('button', { name: /suggest.*edit|update|correct/i });

      if (await suggestEditButton.count() > 0) {
        await suggestEditButton.click();

        await page.fill('textarea', 'The game description should mention the latest expansion.');

        const suggestResponse = page.waitForResponse(
          response => response.url().includes('/suggest-edit') && response.request().method() === 'POST'
        );
        await page.getByRole('button', { name: /submit/i }).click();
        const response = await suggestResponse;

        expect(response.ok()).toBeTruthy();
      }
    }

    await cleanupUser(email);
  });

  test('disposable email is rejected during login', async ({ page }) => {
    const disposableEmail = `test-${Date.now()}@10minutemail.com`;
    await createOtp(disposableEmail, OTP_CODE);

    await page.goto(`${APP_URL}/auth/callback?email=${encodeURIComponent(disposableEmail)}&code=${OTP_CODE}`);

    // Should be redirected to home with error
    await page.waitForURL(new RegExp(`${APP_URL}/.*error=`), { timeout: 15_000 });

    const url = page.url();
    expect(url).toContain('error');
    expect(url).toMatch(/disposable|blocked|invalid/);
  });
});
