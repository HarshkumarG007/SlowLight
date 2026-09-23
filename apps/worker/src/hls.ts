/**
 * HLS Adaptive Bitrate Streaming Manifest Generator
 * RFC 8216 compliant playlist generation for personal video assets.
 */

export interface HLSProfile {
  name: string;
  bandwidth: number;
  avgBandwidth: number;
  width: number;
  height: number;
  codecs: string;
  playlistPath: string;
}

export const DEFAULT_HLS_PROFILES: HLSProfile[] = [
  {
    name: '1080p',
    bandwidth: 4500000,
    avgBandwidth: 4000000,
    width: 1920,
    height: 1080,
    codecs: 'avc1.640028,mp4a.40.2',
    playlistPath: '1080p/index.m3u8',
  },
  {
    name: '720p',
    bandwidth: 2200000,
    avgBandwidth: 2000000,
    width: 1280,
    height: 720,
    codecs: 'avc1.4d401f,mp4a.40.2',
    playlistPath: '720p/index.m3u8',
  },
  {
    name: '480p',
    bandwidth: 1000000,
    avgBandwidth: 900000,
    width: 854,
    height: 480,
    codecs: 'avc1.4d401e,mp4a.40.2',
    playlistPath: '480p/index.m3u8',
  },
  {
    name: '360p',
    bandwidth: 500000,
    avgBandwidth: 450000,
    width: 640,
    height: 360,
    codecs: 'avc1.4d401e,mp4a.40.2',
    playlistPath: '360p/index.m3u8',
  },
];

/**
 * Generates an RFC 8216 HLS Master Playlist linking all bitrate variants.
 */
export function generateMasterPlaylist(profiles: HLSProfile[] = DEFAULT_HLS_PROFILES): string {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '',
  ];

  for (const p of profiles) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},AVERAGE-BANDWIDTH=${p.avgBandwidth},RESOLUTION=${p.width}x${p.height},CODECS="${p.codecs}"`
    );
    lines.push(p.playlistPath);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export interface SegmentInfo {
  index: number;
  duration: number;
  filename: string;
}

/**
 * Calculates transport stream segments for a given video duration.
 */
export function calculateSegments(
  durationSeconds: number,
  targetSegmentDuration = 6.0
): SegmentInfo[] {
  if (durationSeconds <= 0) return [];

  const segments: SegmentInfo[] = [];
  let remaining = durationSeconds;
  let index = 0;

  while (remaining > 0) {
    const segDuration = Math.min(remaining, targetSegmentDuration);
    const paddedIndex = String(index).padStart(3, '0');
    segments.push({
      index,
      duration: Math.round(segDuration * 1000) / 1000,
      filename: `segment_${paddedIndex}.ts`,
    });
    remaining -= segDuration;
    index++;
  }

  return segments;
}

/**
 * Generates an RFC 8216 HLS Media Playlist with transport stream segments.
 */
export function generateMediaPlaylist(
  durationSeconds: number,
  targetSegmentDuration = 6.0
): string {
  const segments = calculateSegments(durationSeconds, targetSegmentDuration);
  const targetDurationCeil = Math.ceil(targetSegmentDuration);

  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${targetDurationCeil}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
    '',
  ];

  for (const seg of segments) {
    lines.push(`#EXTINF:${seg.duration.toFixed(3)},`);
    lines.push(seg.filename);
  }

  lines.push('#EXT-X-ENDLIST');
  return lines.join('\n') + '\n';
}
