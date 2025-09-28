import { describe, it, expect } from 'vitest';
import { buildSingleEventCalendar, escapeIcs, formatDateForIcs } from '@/lib/ics';

describe('ICS helpers', () => {
  it('escapes characters for ICS payloads', () => {
    expect(escapeIcs('Line1\nLine2,Value;Test')).toBe('Line1\\nLine2\\,Value\\;Test');
  });

  it('formats dates into ICS timestamps', () => {
    const value = new Date('2024-06-10T12:30:00Z');
    expect(formatDateForIcs(value)).toBe('20240610T123000Z');
  });

  it('builds a single-event calendar', () => {
    const ics = buildSingleEventCalendar({
      uid: 'event-123@mmo-match.gg',
      title: 'Raid Night',
      description: 'Weekly raid - bring potions',
      location: 'Online',
      startsAt: new Date('2024-06-11T18:00:00Z'),
      createdAt: new Date('2024-06-01T12:00:00Z'),
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Raid Night');
    expect(ics).toContain('LOCATION:Online');
    expect(ics).toContain('UID:event-123@mmo-match.gg');
  });
});
