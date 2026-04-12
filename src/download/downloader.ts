import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { DownloadableItem } from '../instagram/types';

export async function ensurePermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function downloadItem(
  item: DownloadableItem,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!FileSystem.cacheDirectory) throw new Error('No cache directory');

  const filename = `ig_${item.id}_${item.index}.${item.extension}`;
  const localUri = FileSystem.cacheDirectory + filename;

  const task = FileSystem.createDownloadResumable(
    item.downloadUrl,
    localUri,
    {
      headers: {
        Referer: 'https://www.instagram.com/',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    },
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (onProgress && totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
  );

  const result = await task.downloadAsync();
  if (!result) throw new Error('Download returned no result');
  if (result.status !== 200) throw new Error(`Download failed: HTTP ${result.status}`);

  await MediaLibrary.saveToLibraryAsync(result.uri);
  await FileSystem.deleteAsync(result.uri, { idempotent: true });
}
