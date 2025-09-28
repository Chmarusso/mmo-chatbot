import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

export const runtime = 'edge';

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: { profileId: string } }
) {
  const profile = await prisma.profile.findUnique({
    where: { id: params.profileId },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return new Response('Not found', { status: 404 });
  }

  const [from, to] = gradientFromString(profile.name);

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
        <div style={{ fontSize: 36, opacity: 0.8 }}>MMO Match Player Card</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{profile.name}</div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{profile.user.email}</div>
          <div style={{ fontSize: 24, maxWidth: 640, lineHeight: 1.4, opacity: 0.85 }}>
            {profile.bio ?? 'Ready to squad up and conquer the next raid.'}
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75 }}>Generated automatically • {new Date().toLocaleDateString()}</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
