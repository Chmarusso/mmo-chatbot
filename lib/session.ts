import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SESSION_TTL_DAYS, SESSION_COOKIE_NAME } from "@/lib/constants";

const sessionExpiryDate = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + DEFAULT_SESSION_TTL_DAYS);
  return expires;
};

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = sessionExpiryDate();

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(token?: string) {
  const cookieStore = await cookies();
  const sessionToken = token ?? cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return;

  await prisma.session.deleteMany({ where: { token: sessionToken } });
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session.user;
}
