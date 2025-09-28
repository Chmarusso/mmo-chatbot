import { describe, it, expect } from 'vitest';
import { serializeGuildEvent, serializeGuildEventAlert } from '@/lib/guild';

describe('guild event serialization', () => {
  it('serializes events with alerts', () => {
    const event = serializeGuildEvent(
      {
        id: 'event',
        guildId: 'guild',
        title: 'Raid Night',
        description: 'Weekly raid',
        locationType: 'ONLINE',
        locationDetail: 'Discord voice',
        startsAt: new Date('2024-06-10T20:00:00Z'),
        imageUrl: 'https://cdn.example.com/raid.png',
        createdByProfileId: 'profile',
        createdAt: new Date('2024-06-05T00:00:00Z'),
        updatedAt: new Date('2024-06-06T00:00:00Z'),
      } as any,
      [
        {
          id: 'alert',
          eventId: 'event',
          profileId: 'profile',
          channel: 'EMAIL',
          createdAt: new Date('2024-06-05T12:00:00Z'),
        } as any,
      ]
    );

    expect(event).toMatchObject({
      id: 'event',
      title: 'Raid Night',
      alerts: [
        {
          channel: 'EMAIL',
          profileId: 'profile',
        },
      ],
    });
  });

  it('serializes event alerts standalone', () => {
    const alert = serializeGuildEventAlert({
      id: 'alert',
      eventId: 'event',
      profileId: 'profile',
      channel: 'DISCORD',
      createdAt: new Date('2024-06-05T12:00:00Z'),
    } as any);

    expect(alert).toMatchObject({
      eventId: 'event',
      channel: 'DISCORD',
    });
  });
});
