import { describe, it, expect } from 'vitest';
import {
  generateMasterPlaylist,
  calculateSegments,
  generateMediaPlaylist,
  DEFAULT_HLS_PROFILES,
} from './hls.js';

describe('HLS Adaptive Bitrate Streaming Manifest Generator (T12.4)', () => {
  describe('Master Playlist Generation', () => {
    it('generates valid RFC 8216 master playlist header and stream tags', () => {
      const master = generateMasterPlaylist();

      expect(master.startsWith('#EXTM3U\n#EXT-X-VERSION:3')).toBe(true);
      expect(master).toContain('#EXT-X-INDEPENDENT-SEGMENTS');

      // Verify all default profiles are present
      for (const p of DEFAULT_HLS_PROFILES) {
        expect(master).toContain(`BANDWIDTH=${p.bandwidth}`);
        expect(master).toContain(`RESOLUTION=${p.width}x${p.height}`);
        expect(master).toContain(p.playlistPath);
      }
    });

    it('generates custom profile master playlist', () => {
      const customProfiles = [
        {
          name: '720p',
          bandwidth: 2200000,
          avgBandwidth: 2000000,
          width: 1280,
          height: 720,
          codecs: 'avc1.4d401f,mp4a.40.2',
          playlistPath: 'custom_720p.m3u8',
        },
      ];

      const master = generateMasterPlaylist(customProfiles);
      expect(master).toContain('BANDWIDTH=2200000');
      expect(master).toContain('custom_720p.m3u8');
      expect(master).not.toContain('1080p');
    });
  });

  describe('Segment Calculation & Media Playlist Generation', () => {
    it('calculates exact 6-second segments for a 15-second video', () => {
      const duration = 15.0;
      const segments = calculateSegments(duration, 6.0);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({
        index: 0,
        duration: 6.0,
        filename: 'segment_000.ts',
      });
      expect(segments[1]).toEqual({
        index: 1,
        duration: 6.0,
        filename: 'segment_001.ts',
      });
      expect(segments[2]).toEqual({
        index: 2,
        duration: 3.0,
        filename: 'segment_002.ts',
      });
    });

    it('returns empty array for zero or negative duration', () => {
      expect(calculateSegments(0)).toEqual([]);
      expect(calculateSegments(-5)).toEqual([]);
    });

    it('generates compliant VOD media playlist with #EXT-X-ENDLIST', () => {
      const duration = 14.5;
      const playlist = generateMediaPlaylist(duration, 6.0);

      expect(playlist.startsWith('#EXTM3U\n#EXT-X-VERSION:3')).toBe(true);
      expect(playlist).toContain('#EXT-X-TARGETDURATION:6');
      expect(playlist).toContain('#EXT-X-PLAYLIST-TYPE:VOD');
      expect(playlist).toContain('#EXTINF:6.000,\nsegment_000.ts');
      expect(playlist).toContain('#EXTINF:6.000,\nsegment_001.ts');
      expect(playlist).toContain('#EXTINF:2.500,\nsegment_002.ts');
      expect(playlist.trimEnd().endsWith('#EXT-X-ENDLIST')).toBe(true);
    });
  });
});
