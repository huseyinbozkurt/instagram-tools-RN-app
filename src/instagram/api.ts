import type { BridgeContextValue } from '../bridge/WebViewBridge';
export { useBridge } from '../bridge/WebViewBridge';

function buildFetchCode(url: string): string {
  return `
(async function() {
  const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
  const res = await fetch(${JSON.stringify(url)}, {
    credentials: 'include',
    headers: {
      'x-csrftoken': csrf,
      'x-ig-app-id': '936619743392459',
      'x-requested-with': 'XMLHttpRequest',
      'referer': 'https://www.instagram.com/',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
})()
`;
}

export async function fetchPage(
  bridge: BridgeContextValue,
  userId: string,
  type: 'following' | 'followers',
  maxId: string | null,
) {
  let url = `https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=50`;
  if (maxId) url += `&max_id=${encodeURIComponent(maxId)}`;
  return bridge.call(buildFetchCode(url)) as Promise<{
    users: import('./types').IGUser[];
    next_max_id: string | null;
  }>;
}

export async function fetchMediaInfo(
  bridge: BridgeContextValue,
  mediaId: string,
) {
  const url = `https://www.instagram.com/api/v1/media/${mediaId}/info/`;
  const data = (await bridge.call(buildFetchCode(url))) as {
    items: import('./types').IGMediaItem[];
  };
  const item = data?.items?.[0];
  if (!item) throw new Error('No media found for this link');
  return item;
}
