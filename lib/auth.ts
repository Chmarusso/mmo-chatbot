import crypto from "crypto";
import { transporter, SMTP_FROM } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const OTP_EXPIRATION_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES ?? 10);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const generateOtpCode = () => {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return code;
};

const hashOtpCode = (code: string) =>
  crypto.createHash("sha256").update(code).digest("hex");

export async function requestLoginOtp(email: string, redirect?: string) {
  console.log("🔧 Starting requestLoginOtp for:", email);
  const normalizedEmail = normalizeEmail(email);
  const code = generateOtpCode();
  const tokenHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
  
  console.log("📝 Generated OTP code:", code);
  console.log("📅 Expires at:", expiresAt);

  console.log("🗑️ Cleaning up old OTP tokens...");
  await prisma.otpToken.deleteMany({
    where: {
      email: normalizedEmail,
      OR: [{ consumed: true }, { expiresAt: { lt: new Date() } }],
    },
  });

  console.log("👤 Finding or creating user...");
  // Find or create user to get userId for the OTP token
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      profile: {
        create: {
          name: normalizedEmail.split("@")[0],
        },
      },
    },
    update: {},
    include: {
      profile: true,
    },
  });
  
  console.log("👤 User found/created:", user.email);

  console.log("💾 Creating OTP token...");
  await prisma.otpToken.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  const redirectParam = redirect ? `&redirect=${encodeURIComponent(redirect)}` : "";
  const loginLink = `${APP_URL}/auth/callback?email=${encodeURIComponent(
    normalizedEmail
  )}&code=${code}${redirectParam}`;

  // Check if SMTP is configured
  const isSmtpConfigured = process.env.SMTP_HOST && 
                          process.env.SMTP_PORT && 
                          process.env.SMTP_USER && 
                          process.env.SMTP_PASS;

  console.log("📧 SMTP Configuration Check:");
  console.log("  SMTP_HOST:", !!process.env.SMTP_HOST);
  console.log("  SMTP_PORT:", !!process.env.SMTP_PORT);
  console.log("  SMTP_USER:", !!process.env.SMTP_USER);
  console.log("  SMTP_PASS:", !!process.env.SMTP_PASS);
  console.log("  Is SMTP Configured:", isSmtpConfigured);

  if (!isSmtpConfigured) {
    // If SMTP is not configured, just log the OTP to console
    console.log("\n" + "=".repeat(50));
    console.log("🔐 OTP LOGIN CODE (SMTP not configured)");
    console.log("=".repeat(50));
    console.log(`📧 Email: ${normalizedEmail}`);
    console.log(`🔢 OTP Code: ${code}`);
    console.log(`🔗 Magic Link: ${loginLink}`);
    console.log(`⏰ Expires in: ${OTP_EXPIRATION_MINUTES} minutes`);
    console.log("=".repeat(50) + "\n");
    return;
  }

  const textBody = `Your MMO Match login code is ${code}.\n\n` +
    `You can also tap this magic link: ${loginLink}\n\n` +
    `This code expires in ${OTP_EXPIRATION_MINUTES} minutes.`;

  const htmlBody = `
    <p>Your MMO Match login code is <strong>${code}</strong>.</p>
    <p><a href="${loginLink}">Tap here to sign in instantly.</a></p>
    <p>This code expires in ${OTP_EXPIRATION_MINUTES} minutes.</p>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: normalizedEmail,
      subject: "Your MMO Match login link",
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send OTP email", error);
    throw new Error("Failed to send OTP email");
  }
}

export async function verifyOtpAndGetUser(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const tokenHash = hashOtpCode(code);

  const otpToken = await prisma.otpToken.findFirst({
    where: {
      email: normalizedEmail,
      tokenHash,
      consumed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpToken) {
    return null;
  }

  await prisma.otpToken.update({
    where: { id: otpToken.id },
    data: { consumed: true },
  });

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      profile: {
        create: {
          name: normalizedEmail.split("@")[0],
        },
      },
    },
    update: {},
    include: {
      profile: true,
    },
  });

  return user;
}
