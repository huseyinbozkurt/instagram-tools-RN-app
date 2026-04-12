import { useCallback, useRef, useState } from 'react';
import { useBridge, fetchPage } from '../instagram/api';
import type { IGUser, NonFollower } from '../instagram/types';

type Status = 'idle' | 'running' | 'done' | 'error';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useUnfollowerCheck() {
  const bridge = useBridge();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<NonFollower[]>([]);
  const [stats, setStats] = useState({ following: 0, followers: 0 });
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

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

      setStats({ following: following.length, followers: followers.length });
      setResults(nonFollowers);
      setStatus('done');
    } catch (err: unknown) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Check failed');
        setStatus('error');
      }
    }
  }, [bridge]);

  const cancel = useCallback(() => { cancelledRef.current = true; setStatus('idle'); }, []);
  const reset = useCallback(() => { setStatus('idle'); setResults([]); setProgress(''); setError(''); }, []);

  return { status, progress, results, stats, error, start, cancel, reset };
}
