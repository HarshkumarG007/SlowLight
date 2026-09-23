import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveMediaAccess, resolveMediaAccessBatch } from './access.js';

interface MockMediaAsset {
  id: string;
  kind: 'image' | 'video' | 'audio';
  status: string;
  deletedAt: Date | null;
  variants: unknown[];
}

let mockAssets: MockMediaAsset[] = [];

// Mock DB
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => mockAssets),
      })),
    })),
  },
}));

// Mock S3 presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client: unknown, cmd: { input?: { Key?: string } }) => {
    const key = cmd?.input?.Key || 'unknown';
    return `https://s3.example.com/${key}?X-Amz-Signature=mock-sig`;
  }),
}));

describe('Media Access & HLS Adaptive Streaming (T12.4)', () => {
  beforeEach(() => {
    mockAssets = [];
  });

  const testVideoId = '00000000-0000-0000-0000-000000000001';

  it('throws 404 when asset does not exist or is not ready', async () => {
    await expect(
      resolveMediaAccess('non-existent', 'display', 'actor-1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('resolves signed URL for standard image variant with 90s TTL', async () => {
    mockAssets = [
      {
        id: 'img-123',
        kind: 'image',
        status: 'ready',
        deletedAt: null,
        variants: [{ variant: 'display' }],
      },
    ];

    const result = await resolveMediaAccess('img-123', 'display', 'actor-1');
    expect(result.assetId).toBe('img-123');
    expect(result.variant).toBe('display');
    expect(result.url).toContain('m/img-123/display.avif');
    expect(result.expiresAt).toBeDefined();
  });

  it('resolves signed HLS master playlist URL with 900s video TTL', async () => {
    mockAssets = [
      {
        id: testVideoId,
        kind: 'video',
        status: 'ready',
        deletedAt: null,
        variants: [{ variant: 'hls', masterPlaylist: 'master.m3u8' }],
      },
    ];

    const result = await resolveMediaAccess(testVideoId, 'hls', 'actor-1');

    expect(result.assetId).toBe(testVideoId);
    expect(result.variant).toBe('hls');
    // Verifies path points to _hls/<assetId>/master.m3u8
    expect(result.url).toContain(`_hls/${testVideoId}/master.m3u8`);
    
    // Verifies expiresAt is approximately 900 seconds in the future
    const expiresTime = new Date(result.expiresAt).getTime();
    const now = Date.now();
    expect(expiresTime - now).toBeGreaterThan(850 * 1000);
    expect(expiresTime - now).toBeLessThanOrEqual(905 * 1000);
  });

  it('batch resolves media requests with HLS variants', async () => {
    mockAssets = [
      {
        id: testVideoId,
        kind: 'video',
        status: 'ready',
        deletedAt: null,
        variants: [{ variant: 'hls' }],
      },
    ];

    const batch = await resolveMediaAccessBatch(
      [{ assetId: testVideoId, variant: 'hls' }],
      'actor-1'
    );

    expect(batch).toHaveLength(1);
    expect(batch[0]?.variant).toBe('hls');
    expect(batch[0]?.url).toContain(`_hls/${testVideoId}/master.m3u8`);
  });
});
