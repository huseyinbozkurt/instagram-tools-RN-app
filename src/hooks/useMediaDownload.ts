import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useBridge, fetchMediaInfo, fetchHighlightItems, getCookies } from '../instagram/api';
import { parseInstagramUrl, parseMediaItems, parseStoryItems } from '../instagram/mediaExtractor';
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
    const parsed = parseInstagramUrl(text);
    if (!parsed) {
      setError('Could not parse Instagram URL. Supported: posts, reels, stories, highlights.');
      return;
    }
    setPastedUrl(text);
    setStage('fetching');
    try {
      let downloadables: DownloadableItem[];

      if (parsed.type === 'highlight') {
        const storyItems = await fetchHighlightItems(bridge, parsed.highlightId);
        downloadables = parseStoryItems(storyItems);
      } else {
        // Both 'media' and 'story' use the same media info endpoint
        const mediaId = parsed.type === 'story' ? parsed.storyId : parsed.mediaId;
        const rawItem = await fetchMediaInfo(bridge, mediaId);
        downloadables = parseMediaItems(rawItem);
      }

      setItems(downloadables);
      setSelected(new Set(downloadables.map((_, i) => i)));
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

    let cookies = '';
    try { cookies = (await getCookies(bridge)) || ''; } catch {}

    const toDownload = items.filter((item) => selected.has(item.index));
    let failed = 0;
    let lastError = '';
    for (const item of toDownload) {
      try {
        setDownloadProgress((prev) => ({ ...prev, [item.index]: 0.3 }));
        await downloadItem(item, cookies);
        setDownloadProgress((prev) => ({ ...prev, [item.index]: 1 }));
      } catch (err: unknown) {
        failed++;
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    if (failed === toDownload.length) {
      setError(`All downloads failed: ${lastError}`);
      setStage('error');
    } else {
      setStage('done');
    }
  }, [bridge, items, selected]);

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
