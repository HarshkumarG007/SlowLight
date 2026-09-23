import { describe, it, expect } from 'vitest';
import {
  coarsenCoordinate,
  clampCoords,
  projectEquirectangular,
  inverseEquirectangular,
  calculateJourneyPath,
  type MapMemoryPin,
} from './map.js';

describe('Map Projection and Privacy Engine', () => {
  describe('coarsenCoordinate', () => {
    it('coarsens to city level (1 decimal place / ~11 km)', () => {
      expect(coarsenCoordinate(28.6139, 'city')).toBe(28.6);
      expect(coarsenCoordinate(-73.9855, 'city')).toBe(-74.0);
    });

    it('coarsens to area level (0.5 increments / ~55 km)', () => {
      expect(coarsenCoordinate(28.6139, 'area')).toBe(28.5);
      expect(coarsenCoordinate(28.31, 'area')).toBe(28.5);
      expect(coarsenCoordinate(28.1, 'area')).toBe(28.0);
    });

    it('coarsens to country level (integer / ~111 km)', () => {
      expect(coarsenCoordinate(28.6139, 'country')).toBe(29);
      expect(coarsenCoordinate(-73.9855, 'country')).toBe(-74);
    });

    it('caps exact level at 2 decimal places as a privacy guardrail', () => {
      expect(coarsenCoordinate(28.613928, 'exact')).toBe(28.61);
    });

    it('returns 0 for hidden precision', () => {
      expect(coarsenCoordinate(28.6139, 'hidden')).toBe(0);
    });
  });

  describe('clampCoords', () => {
    it('clamps latitude and longitude to standard limits', () => {
      expect(clampCoords({ lat: 95, lng: 200 })).toEqual({ lat: 90, lng: 180 });
      expect(clampCoords({ lat: -105, lng: -220 })).toEqual({ lat: -90, lng: -180 });
      expect(clampCoords({ lat: 45, lng: 12 })).toEqual({ lat: 45, lng: 12 });
    });
  });

  describe('projectEquirectangular', () => {
    it('projects origin (0, 0) to exact center of SVG canvas', () => {
      const point = projectEquirectangular({ lat: 0, lng: 0 }, 1000, 500);
      expect(point).toEqual({ x: 500, y: 250 });
    });

    it('projects top-left (90, -180) to (0, 0)', () => {
      const point = projectEquirectangular({ lat: 90, lng: -180 }, 1000, 500);
      expect(point).toEqual({ x: 0, y: 0 });
    });

    it('projects bottom-right (-90, 180) to (1000, 500)', () => {
      const point = projectEquirectangular({ lat: -90, lng: 180 }, 1000, 500);
      expect(point).toEqual({ x: 1000, y: 500 });
    });
  });

  describe('inverseEquirectangular', () => {
    it('inverts center (500, 250) to (0, 0)', () => {
      const coords = inverseEquirectangular({ x: 500, y: 250 }, 1000, 500);
      expect(coords).toEqual({ lat: 0, lng: 0 });
    });

    it('inverts origin (0, 0) to (90, -180)', () => {
      const coords = inverseEquirectangular({ x: 0, y: 0 }, 1000, 500);
      expect(coords).toEqual({ lat: 90, lng: -180 });
    });
  });

  describe('calculateJourneyPath', () => {
    it('returns empty string for less than 2 pins', () => {
      expect(calculateJourneyPath([])).toBe('');
      const singlePin: MapMemoryPin = {
        id: '1',
        memoryId: 'm1',
        title: 'Only One',
        occurredOn: '2024-01-01',
        significance: 3,
        locationId: 'loc1',
        label: 'Paris',
        lat: 48.85,
        lng: 2.35,
        precision: 'city',
      };
      expect(calculateJourneyPath([singlePin])).toBe('');
    });

    it('generates chronological curved SVG path connecting pins in date order', () => {
      const pinA: MapMemoryPin = {
        id: '1',
        memoryId: 'm1',
        title: 'Earlier Paris',
        occurredOn: '2024-01-01',
        significance: 3,
        locationId: 'loc1',
        label: 'Paris',
        lat: 48.85,
        lng: 2.35,
        precision: 'city',
      };
      const pinB: MapMemoryPin = {
        id: '2',
        memoryId: 'm2',
        title: 'Later Tokyo',
        occurredOn: '2024-06-01',
        significance: 4,
        locationId: 'loc2',
        label: 'Tokyo',
        lat: 35.68,
        lng: 139.69,
        precision: 'city',
      };

      const path = calculateJourneyPath([pinB, pinA]); // passed out of order
      expect(path.startsWith('M ')).toBe(true);
      expect(path.includes('Q ')).toBe(true);
      // First point should be Paris (projected from 2.35, 48.85)
      const expectedParis = projectEquirectangular({ lat: 48.85, lng: 2.35 });
      expect(path.startsWith(`M ${expectedParis.x},${expectedParis.y}`)).toBe(true);
    });
  });
});
