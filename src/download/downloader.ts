import { Platform } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { DownloadableItem } from '../instagram/types';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ (API 33): WRITE_EXTERNAL_STORAGE is obsolete; saving new
    // files via ContentResolver needs no runtime permission at all.
    if (Platform.Version >= 33) return true;
    // Android 10-12 (API 29-32): only write permission is needed for saving.
    // Using writeOnly=true avoids a confusing read-access dialog.
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    return status === 'granted';
  }
  // iOS: standard photo library permission
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
