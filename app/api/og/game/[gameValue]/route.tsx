import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameValue: string }> }
) {
  const { gameValue } = await params;

  const game = await prisma.game.findUnique({
    where: { value: gameValue },
    include: {
      _count: {
        select: {
          profiles: true,
          ratings: true,
          comments: true,
        },
      },
      ratings: {
        select: {
          rating: true,
        },
      },
    },
  });

  if (!game) {
    return new Response('Not found', { status: 404 });
  }

  const avgRating = game.ratings.length > 0
    ? (game.ratings.reduce((sum, r) => sum + r.rating, 0) / game.ratings.length).toFixed(1)
    : null;

  const [from, to] = gradientFromString(game.label);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          color: '#f8fafc',
          background: `linear-gradient(135deg, ${from}, ${to})`,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>{game.label}</div>
          <div style={{ display: 'flex', gap: 50, fontSize: 32, opacity: 0.9 }}>
            <span>{game._count.profiles} players</span>
            {avgRating && <span>Rating: {avgRating}</span>}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
