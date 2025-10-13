import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      preferredGame: true,
      preferredTimeSlot: true,
      preferredLanguage: true,
      preferredPlaystyle: true,
      _count: {
        select: {
          matchesAsOne: true,
          matchesAsTwo: true,
          guilds: true,
        },
      },
    },
  });

  if (!profile) {
    return new Response('Not found', { status: 404 });
  }

  const totalMatches = profile._count.matchesAsOne + profile._count.matchesAsTwo;
  const [from, to] = gradientFromString(profile.name);

  const preferences = [
    profile.preferredGame?.label,
    profile.preferredTimeSlot?.label,
    profile.preferredLanguage?.label,
    profile.preferredPlaystyle?.label,
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          color: '#f8fafc',
          background: `linear-gradient(135deg, ${from}, ${to})`,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.8 }}>MMOPLAYA • Player Profile</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{profile.name}</div>
          {profile.bio && (
            <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 800, lineHeight: 1.4 }}>
              {profile.bio}
            </div>
          )}
          {preferences.length > 0 && (
            <div style={{ display: 'flex', gap: 30, fontSize: 24, opacity: 0.85, flexWrap: 'wrap', maxWidth: 900 }}>
              {preferences.map((pref, i) => (
                <span key={i}>• {pref}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 40, fontSize: 24, opacity: 0.85, marginTop: 10 }}>
            {totalMatches > 0 && <span>{totalMatches} matches</span>}
            {profile._count.guilds > 0 && <span>{profile._count.guilds} guilds</span>}
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75 }}>Squad up on MMOPLAYA</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
