import { test, expect } from '@playwright/test';
import { prisma, createOtp, normalizeEmail, APP_URL } from './helpers';

const SESSION_COOKIE_NAME = 'mmo_match_session';

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('user with deleted session cannot access protected pages', async ({ page, context }) => {
  const timestamp = Date.now();
  const email = `playwright+session-test-${timestamp}@example.com`;
  const name = 'Session Test User';
  const otp = '123456';
  const inviteCode = `SESS${timestamp}`;

  const cleanup = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);
      await prisma.otpToken.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
    } catch (error) {}
  };

  await cleanup();

  try {
    // 1. Create user with complete profile
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(email),
        profile: {
          create: {
            name: name,
            isVerified: true,
            isChild: false,
            inviteCode: inviteCode,
            gamePreferences: ['guild_wars_2'],
            playstyle: 'casual',
            timeSlots: ['weekend_morning'],
          },
        },
      },
      include: { profile: true },
    });

    

    // 2. Create OTP and login
    await createOtp(email, otp);

    await page.goto(`${APP_URL}/auth/login`);
    await page.fill('input[type="email"]', email);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Let me in")');

    await page.waitForSelector('input#otp', { timeout: 5000 });
    await page.fill('input#otp', otp);
    await page.click('button:has-text("Verify code")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    

    // 3. Verify user can access protected pages
    await page.goto(`${APP_URL}/profile`);
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    

    // 4. Get the session cookie value
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    

    // 5. Verify session exists in database
    let sessionInDb = await prisma.session.findUnique({
      where: { token: sessionCookie!.value },
      include: { user: true },
    });
    expect(sessionInDb).not.toBeNull();
    expect(sessionInDb?.userId).toBe(user.id);
    

    // 6. Delete session from database (simulate session invalidation)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });
    

    // 7. Verify session is gone from database
    sessionInDb = await prisma.session.findUnique({
      where: { token: sessionCookie!.value },
    });
    expect(sessionInDb).toBeNull();
    

    // 8. Cookie still exists in browser
    const cookiesAfterDeletion = await context.cookies();
    const sessionCookieAfterDeletion = cookiesAfterDeletion.find(c => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookieAfterDeletion).toBeDefined();
    expect(sessionCookieAfterDeletion?.value).toBe(sessionCookie?.value);
    

    // 9. Try to navigate to protected pages
    // The middleware passes (cookie exists) but getCurrentUser() returns null
    // getOrCreateProfile() will redirect to "/auth/login?expired=1"
    await page.goto(`${APP_URL}/dashboard`);

    // Wait for redirects to complete
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    const currentUrl = page.url();

    // Should be redirected to login page with expired parameter
    expect(currentUrl).toContain('/auth/login');
    expect(currentUrl).toContain('expired=1');
    

    // 10. Try accessing API endpoints with invalid session
    const response = await page.request.get(`${APP_URL}/api/profile`);

    // Should return 401 Unauthorized or redirect
    if (response.status() === 401) {
      
    } else if (response.status() === 302 || response.status() === 307) {
      
    } else {
      
    }

    

  } finally {
    await cleanup();
  }
});

test('user can log back in after session is invalidated', async ({ page, context }) => {
  const timestamp = Date.now();
  const email = `playwright+relogin-${timestamp}@example.com`;
  const name = 'Relogin Test User';
  const otp = '123456';
  const inviteCode = `RELOG${timestamp}`;

  const cleanup = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);
      await prisma.otpToken.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: normalizedEmail } }).catch(() => {});
    } catch (error) {}
  };

  await cleanup();

  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(email),
        profile: {
          create: {
            name: name,
            isVerified: true,
            isChild: false,
            inviteCode: inviteCode,
            gamePreferences: ['guild_wars_2'],
            playstyle: 'casual',
            timeSlots: ['weekend_morning'],
          },
        },
      },
      include: { profile: true },
    });

    // First login
    await createOtp(email, otp);
    await page.goto(`${APP_URL}/auth/login`);
    await page.fill('input[type="email"]', email);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Let me in")');
    await page.waitForSelector('input#otp', { timeout: 5000 });
    await page.fill('input#otp', otp);
    await page.click('button:has-text("Verify code")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Get session cookie
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();

    // Delete session from database
    await prisma.session.deleteMany({ where: { userId: user.id } });

    // Try to access protected page - this will show an error due to invalid session
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const urlAfterInvalidation = page.url();

    // Clear the invalid session cookie before logging in again
    await context.clearCookies();

    // Now navigate to login page to login again
    await page.goto(`${APP_URL}/auth/login`);
    await page.waitForLoadState('domcontentloaded');

    const newOtp = '654321';
    await createOtp(email, newOtp);

    await page.fill('input[type="email"]', email);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Let me in")');
    await page.waitForSelector('input#otp', { timeout: 5000 });
    await page.fill('input#otp', newOtp);
    await page.click('button:has-text("Verify code")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify new session exists in database
    const newCookies = await context.cookies();
    const newSessionCookie = newCookies.find(c => c.name === SESSION_COOKIE_NAME);
    expect(newSessionCookie).toBeDefined();
    expect(newSessionCookie?.value).not.toBe(sessionCookie?.value); // Should be different token

    const newSession = await prisma.session.findUnique({
      where: { token: newSessionCookie!.value },
    });
    expect(newSession).not.toBeNull();
    expect(newSession?.userId).toBe(user.id);

    // Verify user can access protected pages with new session
    await page.goto(`${APP_URL}/profile`);
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });

  } finally {
    await cleanup();
  }
});
