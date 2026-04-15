import type { DownloadableItem, IGMediaItem } from './types';

const IG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export type ParsedUrl =
  | { type: 'media'; mediaId: string }
  | { type: 'story'; storyId: string }
  | { type: 'highlight'; highlightId: string };

export function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  // Instagram shortcodes are max 11 chars; newer URLs append encrypted tracking
  // data using the same character set, so truncate to the valid shortcode length.
  return match[1].length > 11 ? match[1].slice(0, 11) : match[1];
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

export function parseInstagramUrl(url: string): ParsedUrl | null {
  // Highlight (web): instagram.com/stories/highlights/123456789/
  const hlMatch = url.match(/instagram\.com\/stories\/highlights\/(\d+)/);
  if (hlMatch) return { type: 'highlight', highlightId: hlMatch[1] };

  // Highlight (app share): instagram.com/s/aGlnaGxpZ2h0OjE4MDY0...
  // The path segment is a base64url-encoded string like "highlight:18064..."
  const shortLinkMatch = url.match(/instagram\.com\/s\/([A-Za-z0-9_-]+)/);
  if (shortLinkMatch) {
    try {
      const decoded = atob(shortLinkMatch[1].replace(/-/g, '+').replace(/_/g, '/'));
      const hlId = decoded.match(/^highlight:(\d+)$/);
      if (hlId) return { type: 'highlight', highlightId: hlId[1] };
    } catch { /* not a valid base64 highlight link, continue */ }
  }

  // Story: instagram.com/stories/username/123456789/
  const storyMatch = url.match(/instagram\.com\/stories\/([A-Za-z0-9._]+)\/(\d+)/);
  if (storyMatch) return { type: 'story', storyId: storyMatch[2] };

  // Post / Reel / TV
  const shortcode = extractShortcode(url);
  if (shortcode) {
    try {
      return { type: 'media', mediaId: shortcodeToMediaId(shortcode) };
    } catch { return null; }
  }

  return null;
}

function normalizeSingle(item: IGMediaItem, index: number, labelPrefix?: string): DownloadableItem {
  const isVideo = item.media_type === 2;
  const candidates = [...(item.image_versions2?.candidates ?? [])].sort((a, b) => b.width - a.width);
  const bestImage = candidates[0];
  const bestVideo = item.video_versions?.find((v) => v.type === 101) ?? item.video_versions?.[0];
  const prefix = labelPrefix ?? (isVideo ? 'Video' : 'Photo');

  return {
    id: item.pk,
    index,
    type: isVideo ? 'video' : 'photo',
    thumbnailUrl: bestImage?.url ?? '',
    downloadUrl: isVideo ? (bestVideo?.url ?? '') : (bestImage?.url ?? ''),
    extension: isVideo ? 'mp4' : 'jpg',
    label: `${prefix} ${index + 1}`,
  };
}

export function parseMediaItems(item: IGMediaItem): DownloadableItem[] {
  if (item.media_type === 8 && item.carousel_media) {
    return item.carousel_media.map((child, i) => normalizeSingle(child, i));
  }
  return [normalizeSingle(item, 0)];
}

export function parseStoryItems(items: IGMediaItem[]): DownloadableItem[] {
  return items.map((item, i) => normalizeSingle(item, i, 'Story'));
}
