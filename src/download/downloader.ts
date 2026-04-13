import { File, Paths, Directory } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { DownloadableItem } from '../instagram/types';

export async function ensurePermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function downloadItem(
  item: DownloadableItem,
  cookies: string,
): Promise<void> {
  if (!item.downloadUrl) throw new Error('No download URL');

  const dest = new File(Paths.cache, `ig_${item.id}_${item.index}.${item.extension}`);

  const file = await File.downloadFileAsync(item.downloadUrl, dest, {
    headers: {
      Referer: 'https://www.instagram.com/',
      Cookie: cookies,
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
    idempotent: true,
  });

  await MediaLibrary.saveToLibraryAsync(file.uri);
  file.delete();
}
