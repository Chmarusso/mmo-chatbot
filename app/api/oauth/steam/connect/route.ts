import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/profile";

export async function GET() {
  try {
    const profile = await getOrCreateProfile();

    // Steam OpenID 2.0 authentication
    const steamOpenIdUrl = new URL('https://steamcommunity.com/openid/login');
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/steam/callback`;

    steamOpenIdUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
    steamOpenIdUrl.searchParams.set('openid.mode', 'checkid_setup');
    steamOpenIdUrl.searchParams.set('openid.return_to', returnUrl);
    steamOpenIdUrl.searchParams.set('openid.realm', process.env.NEXT_PUBLIC_BASE_URL || '');
    steamOpenIdUrl.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
    steamOpenIdUrl.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');

    return NextResponse.redirect(steamOpenIdUrl.toString());
  } catch (error) {
    console.error('Steam OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=steam_oauth_failed`);
  }
}
