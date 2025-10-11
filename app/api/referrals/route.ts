import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/profile";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/referral";

export async function GET() {
  try {
    const profile = await getOrCreateProfile();

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(profile.id);

    // Get referral stats
    const stats = await getReferralStats(profile.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      stats,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json(
      { error: "Unauthorized or error fetching referral data" },
      { status: 401 }
    );
  }
}
