import type { DownloadableItem, IGMediaItem } from './types';

const IG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export function shortcodeToMediaId(shortcode: string): string {
  let id = BigInt(0);
  for (const char of shortcode) {
    const idx = IG_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid shortcode character: "${char}"`);
    id = id * BigInt(64) + BigInt(idx);
  }
  return id.toString();
}

export function extractMediaId(url: string): string | null {
  const shortcode = extractShortcode(url);
  if (!shortcode) return null;
  try { return shortcodeToMediaId(shortcode); } catch { return null; }
}

function normalizeSingle(item: IGMediaItem, index: number): DownloadableItem {
  const isVideo = item.media_type === 2;
  const candidates = [...(item.image_versions2?.candidates ?? [])].sort((a, b) => b.width - a.width);
  const bestImage = candidates[0];
  const bestVideo = item.video_versions?.find((v) => v.type === 101) ?? item.video_versions?.[0];

  return {
    id: item.pk,
    index,
    type: isVideo ? 'video' : 'photo',
    thumbnailUrl: bestImage?.url ?? '',
    downloadUrl: isVideo ? (bestVideo?.url ?? '') : (bestImage?.url ?? ''),
    extension: isVideo ? 'mp4' : 'jpg',
    label: isVideo ? `Video ${index + 1}` : `Photo ${index + 1}`,
  };
}

export function parseMediaItems(item: IGMediaItem): DownloadableItem[] {
  if (item.media_type === 8 && item.carousel_media) {
    return item.carousel_media.map((child, i) => normalizeSingle(child, i));
  }
  return [normalizeSingle(item, 0)];
}
