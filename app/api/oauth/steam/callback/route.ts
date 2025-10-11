import { NextRequest, NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { awardExp } from "@/lib/exp";

export async function GET(request: NextRequest) {
  try {
    const profile = await getOrCreateProfile();
    const searchParams = request.nextUrl.searchParams;

    // Verify Steam OpenID response
    const mode = searchParams.get('openid.mode');
    if (mode !== 'id_res') {
      throw new Error('Invalid OpenID mode');
    }

    const claimedId = searchParams.get('openid.claimed_id');
    if (!claimedId) {
      throw new Error('No claimed ID');
    }

    // Extract Steam ID from claimed_id URL
    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
    if (!steamIdMatch) {
      throw new Error('Invalid Steam ID');
    }

    const steamId = steamIdMatch[1];

    // Validate the response with Steam
    const validationUrl = new URL('https://steamcommunity.com/openid/login');
    searchParams.set('openid.mode', 'check_authentication');

    const validationResponse = await fetch(validationUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: searchParams.toString(),
    });

    const validationText = await validationResponse.text();
    if (!validationText.includes('is_valid:true')) {
      throw new Error('Steam validation failed');
    }

    // Fetch Steam profile
    const steamApiKey = process.env.STEAM_API_KEY;
    if (!steamApiKey) {
      console.warn('STEAM_API_KEY not configured');
    }

    let steamData = null;
    if (steamApiKey) {
      const playerSummaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
      const summaryResponse = await fetch(playerSummaryUrl);
      const summaryData = await summaryResponse.json();

      if (summaryData.response?.players?.[0]) {
        steamData = summaryData.response.players[0];
      }

      // Fetch owned games
      const ownedGamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;
      const gamesResponse = await fetch(ownedGamesUrl);
      const gamesData = await gamesResponse.json();

      if (gamesData.response?.games) {
        // Store games data in metadata
        steamData = {
          ...steamData,
          games: gamesData.response.games,
        };
      }
    }

    // Save Steam connection to profile (we'll need to add this field)
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        // Note: You'll need to add steamId field to schema
        // steamId: steamId,
      },
    });

    // Award EXP for Steam verification
    await awardExp({
      profileId: profile.id,
      eventType: 'STEAM_IMPORT',
      metadata: {
        steamId,
        gamesCount: steamData?.games?.length || 0,
      },
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?steam=connected`);
  } catch (error) {
    console.error('Steam callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=steam_failed`);
  }
}
