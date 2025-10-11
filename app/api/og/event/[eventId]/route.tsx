import { ImageResponse } from 'next/og';
import { prisma } from "@/lib/prisma";
import { gradientFromString, formatDateTime } from "@/lib/og";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const event = await prisma.guildEvent.findUnique({
    where: { id: eventId },
    include: {
      guild: true,
    },
  });

  if (!event) {
    return new Response('Not found', { status: 404 });
  }

  const [from, to] = gradientFromString(`${event.guild.name}-${event.title}`);

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
        <div style={{ fontSize: 36, opacity: 0.8 }}>{event.guild.name} • Event</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{event.title}</div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>
            {formatDateTime(event.startsAt)} · {event.locationType === 'ONLINE' ? 'Online event' : (event.locationDetail ?? 'Offline venue TBD')}
          </div>
          {event.description ? (
            <div style={{ fontSize: 24, lineHeight: 1.4, maxWidth: 720, opacity: 0.85 }}>
              {event.description}
            </div>
          ) : null}
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
