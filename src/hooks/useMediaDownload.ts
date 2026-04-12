import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useBridge, fetchMediaInfo } from '../instagram/api';
import { extractMediaId, parseMediaItems } from '../instagram/mediaExtractor';
import { downloadItem, ensurePermission } from '../download/downloader';
import type { DownloadableItem } from '../instagram/types';

type Stage = 'idle' | 'fetching' | 'selecting' | 'downloading' | 'done' | 'error';

export function useMediaDownload() {
  const bridge = useBridge();
  const [stage, setStage] = useState<Stage>('idle');
  const [items, setItems] = useState<DownloadableItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [pastedUrl, setPastedUrl] = useState('');

  const readClipboard = useCallback(async () => {
    setError('');
    const text = await Clipboard.getStringAsync();
    if (!text || !text.includes('instagram.com')) {
      setError('No Instagram link found in clipboard');
      return;
    }
    const mediaId = extractMediaId(text);
    if (!mediaId) {
      setError('Could not parse Instagram URL. Supported: posts, reels, videos.');
      return;
    }
    setPastedUrl(text);
    setStage('fetching');
    try {
      const rawItem = await fetchMediaInfo(bridge, mediaId);
      const parsed = parseMediaItems(rawItem);
      setItems(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setStage('selecting');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch media info');
      setStage('error');
    }
  }, [bridge]);

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  const download = useCallback(async () => {
    const ok = await ensurePermission();
    if (!ok) { setError('Photo library permission required.'); return; }
    setStage('downloading');
    setDownloadProgress({});
    const toDownload = items.filter((item) => selected.has(item.index));
    let failed = 0;
    for (const item of toDownload) {
      try {
        await downloadItem(item, (p) =>
          setDownloadProgress((prev) => ({ ...prev, [item.index]: p })),
        );
      } catch { failed++; }
    }
    if (failed === toDownload.length) {
      setError('All downloads failed. Links may have expired — try again.');
      setStage('error');
    } else {
      setStage('done');
    }
  }, [items, selected]);

  const reset = useCallback(() => {
    setStage('idle');
    setItems([]);
    setSelected(new Set());
    setDownloadProgress({});
    setError('');
    setPastedUrl('');
  }, []);

  return { stage, items, selected, downloadProgress, error, pastedUrl, readClipboard, toggleSelect, download, reset };
}
