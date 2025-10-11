import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

type CategoryType = 'timeslot' | 'language' | 'playstyle';

const CATEGORY_LABELS: Record<CategoryType, string> = {
  timeslot: 'Time Slots',
  language: 'Languages',
  playstyle: 'Playstyles',
};

const CATEGORY_DESCRIPTIONS: Record<CategoryType, string> = {
  timeslot: 'Find players who match your gaming schedule',
  language: 'Connect with players who speak your language',
  playstyle: 'Squad up with players who share your playstyle',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryType: string }> }
) {
  const { categoryType } = await params;

  if (!['timeslot', 'language', 'playstyle'].includes(categoryType)) {
    return new Response('Not found', { status: 404 });
  }

  const type = categoryType as CategoryType;
  let count = 0;
  let topItems: string[] = [];

  try {
    if (type === 'timeslot') {
      const options = await prisma.timeSlotOption.findMany({
        include: {
          _count: {
            select: { profiles: true },
          },
        },
        orderBy: {
          profiles: {
            _count: 'desc',
          },
        },
        take: 3,
      });
      count = options.reduce((sum, opt) => sum + opt._count.profiles, 0);
      topItems = options.map(opt => opt.label);
    } else if (type === 'language') {
      const options = await prisma.languageOption.findMany({
        include: {
          _count: {
            select: { profiles: true },
          },
        },
        orderBy: {
          profiles: {
            _count: 'desc',
          },
        },
        take: 3,
      });
      count = options.reduce((sum, opt) => sum + opt._count.profiles, 0);
      topItems = options.map(opt => opt.label);
    } else {
      const options = await prisma.playstyleOption.findMany({
        include: {
          _count: {
            select: { profiles: true },
          },
        },
        orderBy: {
          profiles: {
            _count: 'desc',
          },
        },
        take: 3,
      });
      count = options.reduce((sum, opt) => sum + opt._count.profiles, 0);
      topItems = options.map(opt => opt.label);
    }
  } catch (error) {
    console.error('Error fetching category data:', error);
  }

  const [from, to] = gradientFromString(`category-${type}`);

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
        <div style={{ fontSize: 36, opacity: 0.8 }}>MMO Match • Categories</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{CATEGORY_LABELS[type]}</div>
          <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 800 }}>
            {CATEGORY_DESCRIPTIONS[type]}
          </div>
          {topItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 24, opacity: 0.85 }}>
              <div>Popular {CATEGORY_LABELS[type].toLowerCase()}:</div>
              <div style={{ display: 'flex', gap: 20, fontSize: 22 }}>
                {topItems.map((item, i) => (
                  <span key={i}>• {item}</span>
                ))}
              </div>
            </div>
          )}
          {count > 0 && (
            <div style={{ fontSize: 24, opacity: 0.85, marginTop: 10 }}>
              {count} active players
            </div>
          )}
        </div>
        <div style={{ fontSize: 24, opacity: 0.75 }}>Find your perfect match on MMO Match</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
