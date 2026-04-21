import { useCallback, useEffect, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { useBridge, fetchPage } from '../instagram/api';
import type { IGUser, NonFollower } from '../instagram/types';

type Status = 'idle' | 'running' | 'done' | 'error';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const CACHE_FILE = new File(Paths.document, 'unfollower_results.json');

type CachedData = {
  results: NonFollower[];
  stats: { following: number; followers: number };
  checkedAt: string;
};

function loadCache(): CachedData | null {
  try {
    if (!CACHE_FILE.exists) return null;
    const raw = CACHE_FILE.text();
    return JSON.parse(raw) as CachedData;
  } catch { return null; }
}

function saveCache(data: CachedData) {
  try { CACHE_FILE.create(); CACHE_FILE.write(JSON.stringify(data)); } catch {}
}

export function useUnfollowerCheck() {
  const bridge = useBridge();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<NonFollower[]>([]);
  const [stats, setStats] = useState({ following: 0, followers: 0 });
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

  // Load cached results on mount
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setResults(cached.results);
      setStats(cached.stats);
      setCheckedAt(cached.checkedAt);
      setStatus('done');
    }
  }, []);

  const start = useCallback(async () => {
    if (!bridge.userId) return;
    cancelledRef.current = false;
    setStatus('running');
    setError('');
    setResults([]);

    try {
      const following: IGUser[] = [];
      let maxId: string | null = null;
      do {
        if (cancelledRef.current) return;
        const page = await fetchPage(bridge, bridge.userId, 'following', maxId);
        if (!page) throw new Error('Empty response while fetching following list');
        following.push(...(page.users ?? []));
        maxId = page.next_max_id ?? null;
        setProgress(`Fetching following\u2026 ${following.length} loaded`);
        if (maxId) await sleep(1200 + Math.random() * 700);
      } while (maxId);

      const followers: IGUser[] = [];
      maxId = null;
      do {
        if (cancelledRef.current) return;
        const page = await fetchPage(bridge, bridge.userId, 'followers', maxId);
        if (!page) throw new Error('Empty response while fetching followers list');
        followers.push(...(page.users ?? []));
        maxId = page.next_max_id ?? null;
        setProgress(`Fetching followers\u2026 ${followers.length} loaded`);
        if (maxId) await sleep(1200 + Math.random() * 700);
      } while (maxId);

      setProgress('Comparing lists\u2026');
      const followerIds = new Set(followers.map((u) => u.pk));
      const nonFollowers: NonFollower[] = following
        .filter((u) => !followerIds.has(u.pk))
        .map((u) => ({
          id: u.pk,
          username: u.username,
          fullName: u.full_name ?? '',
          avatar: u.profile_pic_url ?? '',
          isVerified: u.is_verified,
          isPrivate: u.is_private,
        }));

      const newStats = { following: following.length, followers: followers.length };
      const now = new Date().toISOString();

      setStats(newStats);
      setResults(nonFollowers);
      setCheckedAt(now);
      setStatus('done');

      saveCache({ results: nonFollowers, stats: newStats, checkedAt: now });
    } catch (err: unknown) {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : 'Check failed';
        if (msg.includes('401')) {
          try { if (CACHE_FILE.exists) CACHE_FILE.delete(); } catch {}
          setStatus('idle');
          bridge.forceRelogin();
        } else {
          setError(msg);
          setStatus('error');
        }
      }
    }
  }, [bridge]);

  const cancel = useCallback(() => { cancelledRef.current = true; setStatus('idle'); }, []);
  const reset = useCallback(() => { setStatus('idle'); setResults([]); setProgress(''); setError(''); setCheckedAt(null); }, []);

  return { status, progress, results, stats, checkedAt, error, start, cancel, reset };
}
