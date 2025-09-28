import { describe, it, expect } from 'vitest';
import { distanceMeters, isWithinRadius } from '@/lib/geo';

describe('geo helpers', () => {
  it('computes zero distance for identical points', () => {
    expect(distanceMeters(0, 0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('computes expected distance between known coordinates', () => {
    const dist = distanceMeters(37.7749, -122.4194, 34.0522, -118.2437); // SF to LA
    expect(dist).toBeGreaterThan(550_000);
    expect(dist).toBeLessThan(570_000);
  });

  it('detects when within radius', () => {
    const within = isWithinRadius(37.7749, -122.4194, 37.775, -122.4195, 30);
    expect(within).toBe(true);
  });

  it('detects when outside radius', () => {
    const inside = isWithinRadius(37.7749, -122.4194, 37.7849, -122.4194, 100);
    expect(inside).toBe(false);
  });
});
