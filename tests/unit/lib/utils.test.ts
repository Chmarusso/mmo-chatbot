import { describe, it, expect } from 'vitest';
import { timeSlotsOverlap } from '@/lib/utils';

describe('timeSlotsOverlap', () => {
  it('returns true for identical slots', () => {
    expect(timeSlotsOverlap('weekdays_evenings', 'weekdays_evenings')).toBe(true);
  });

  it('treats adjacent evening windows as overlapping', () => {
    expect(timeSlotsOverlap('weekends_evenings', 'weekends_late')).toBe(true);
    expect(timeSlotsOverlap('weekends_late', 'weekends_evenings')).toBe(true);
  });

  it('matches loose evening/night combinations', () => {
    expect(timeSlotsOverlap('weekdays_afternoons', 'weekdays_evenings')).toBe(true);
    expect(timeSlotsOverlap('weekdays_evenings', 'weekdays_afternoons')).toBe(true);
  });

  it('returns false for different days without overlap', () => {
    expect(timeSlotsOverlap('weekdays_evenings', 'weekends_evenings')).toBe(false);
    expect(timeSlotsOverlap('weekdays_mornings', 'weekends_late')).toBe(false);
  });

  it('returns false if either slot is empty', () => {
    expect(timeSlotsOverlap(null, 'weekdays_evenings')).toBe(false);
    expect(timeSlotsOverlap(undefined, undefined)).toBe(false);
  });
});
