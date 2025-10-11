import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      owner: {
        include: { user: true },
      },
      members: true,
    },
  });

  if (!guild) {
    return new Response('Not found', { status: 404 });
  }

  const [from, to] = gradientFromString(guild.name);

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
        <div style={{ fontSize: 36, opacity: 0.8 }}>MMO Match Guild</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{guild.name}</div>
          <div style={{ fontSize: 24, opacity: 0.9, maxWidth: 700 }}>
            {guild.description ?? 'Coordinating raids and adventures across the galaxy.'}
          </div>
          <div style={{ display: 'flex', gap: 40, fontSize: 24, opacity: 0.85 }}>
            <span>Owner: {guild.owner.name}</span>
            <span>Members: {guild.members.length}</span>
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
