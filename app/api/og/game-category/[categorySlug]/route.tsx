import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categorySlug: string }> }
) {
  const { categorySlug } = await params;

  const category = await prisma.gameCategory.findUnique({
    where: { value: categorySlug },
    include: {
      games: {
        orderBy: { label: "asc" },
        take: 5,
      },
      _count: {
        select: { games: true },
      },
    },
  });

  if (!category) {
    return new Response('Not found', { status: 404 });
  }

  const [from, to] = gradientFromString(`game-category-${categorySlug}`);

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
        <div style={{ fontSize: 36, opacity: 0.8 }}>MMOPLAYA • Game Categories</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{category.label}</div>

          {category.description && (
            <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 900 }}>
              {category.description}
            </div>
          )}

          {category.games.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 24, opacity: 0.85 }}>
              <div>Featured games:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, fontSize: 22 }}>
                {category.games.map((game, i) => (
                  <span key={i}>• {game.label}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 24, opacity: 0.85, marginTop: 10 }}>
            {category._count.games} {category._count.games === 1 ? 'game' : 'games'} available
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.75 }}>Find your perfect match on MMOPLAYA</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
