import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { validatePaymentSubmission } from "@/lib/eth";
import { serializeCreationCode, getGuildCodeStatus } from "@/lib/guild";

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { code, ...paymentPayload } = body as Record<string, unknown>;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  let submission;
  try {
    submission = validatePaymentSubmission(paymentPayload as any);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase();
  const existingCode = await prisma.guildCreationCode.findUnique({
    where: { code: normalizedCode },
    include: { payment: true },
  });

  if (!existingCode) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const now = new Date();
  if (existingCode.expiresAt.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "Code expired" }, { status: 409 });
  }

  if (existingCode.redeemedAt) {
    return NextResponse.json({ error: "Code already redeemed" }, { status: 409 });
  }

  await prisma.guildCreationPayment.upsert({
    where: { codeId: existingCode.id },
    create: {
      codeId: existingCode.id,
      chainId: submission.chainId,
      tokenAddress: submission.tokenAddress ?? null,
      amountWei: submission.amountWei,
      txHash: submission.txHash,
      payerAddress: submission.payerAddress,
      payerProfileId: profile.id,
      status: "CONFIRMED",
      confirmedAt: now,
    },
    update: {
      chainId: submission.chainId,
      tokenAddress: submission.tokenAddress ?? null,
      amountWei: submission.amountWei,
      txHash: submission.txHash,
      payerAddress: submission.payerAddress,
      payerProfileId: profile.id,
      status: "CONFIRMED",
      confirmedAt: now,
    },
  });

  const updatedCode = await prisma.guildCreationCode.findUnique({
    where: { id: existingCode.id },
    include: { payment: true },
  });

  if (!updatedCode) {
    return NextResponse.json({ error: "Could not load updated code" }, { status: 500 });
  }

  const status = getGuildCodeStatus(updatedCode);

  return NextResponse.json({
    code: serializeCreationCode(updatedCode),
    payment: updatedCode.payment
      ? {
          id: updatedCode.payment.id,
          status: updatedCode.payment.status,
          chainId: updatedCode.payment.chainId,
          tokenAddress: updatedCode.payment.tokenAddress,
          payerAddress: updatedCode.payment.payerAddress,
          amountWei: updatedCode.payment.amountWei,
          txHash: updatedCode.payment.txHash,
          confirmedAt: updatedCode.payment.confirmedAt?.toISOString() ?? null,
        }
      : null,
    status,
  });
}
