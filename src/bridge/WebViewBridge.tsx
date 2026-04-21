import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { BRIDGE_INIT_SCRIPT } from './injectedScript';

function getDeviceUserAgent(): string {
  if (Platform.OS === 'android') {
    const c = Platform.constants as { Release?: string; Model?: string };
    const ver = c.Release ?? String(Platform.Version);
    const model = (c.Model ?? 'Android').replace(/[()]/g, '');
    return `Mozilla/5.0 (Linux; Android ${ver}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36`;
  }
  const iosVer = String(Platform.Version).split('.').slice(0, 2).join('_');
  const iosMajor = String(Platform.Version).split('.')[0];
  return `Mozilla/5.0 (iPhone; CPU iPhone OS ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${iosMajor}.0 Mobile/15E148 Safari/604.1`;
}

const DEVICE_USER_AGENT = getDeviceUserAgent();

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type BridgeContextValue = {
  call: (jsCode: string) => Promise<unknown>;
  isLoggedIn: boolean | null;
  userId: string | null;
  showLogin: () => void;
  forceRelogin: () => void;
};

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridge(): BridgeContextValue {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error('useBridge must be used inside <WebViewBridgeProvider>');
  return ctx;
}

// ── Check-auth script (re-injected on app foreground) ─────────────────────────

const CHECK_AUTH_JS = `
(function() {
  if (!window.__RNBridgeInstalled) { true; return; }
  var dsMatch = document.cookie.match(/ds_user_id=(\\d+)/);
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'auth_status',
    isLoggedIn: !!dsMatch,
    userId: dsMatch ? dsMatch[1] : null,
  }));
  true;
})();
true;
`;

// ── Provider ──────────────────────────────────────────────────────────────────

export function WebViewBridgeProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebView>(null);
  const pending = useRef<Map<string, PendingRequest>>(new Map());
  const queue = useRef<Array<() => void>>([]);
  const ready = useRef(false);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);

  // Re-check auth when app resumes from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready.current) {
        webViewRef.current?.injectJavaScript(CHECK_AUTH_JS);
      }
    });
    return () => sub.remove();
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (msg.type === 'auth_status') {
      const loggedIn = msg.isLoggedIn as boolean;
      setIsLoggedIn(loggedIn);
      setUserId((msg.userId as string | null) ?? null);
      if (loggedIn) setFullScreen(false);
      else setFullScreen(true);
      return;
    }

    if (msg.type === 'bridge_result') {
      const id = msg.requestId as string;
      const req = pending.current.get(id);
      if (!req) return;
      clearTimeout(req.timer);
      pending.current.delete(id);
      if (msg.error) req.reject(new Error(msg.error as string));
      else req.resolve(msg.payload);
    }
  }, []);

  const handleLoadEnd = useCallback(() => {
    ready.current = true;
    webViewRef.current?.injectJavaScript(CHECK_AUTH_JS);
    const flushed = queue.current.splice(0);
    flushed.forEach((fn) => fn());
  }, []);

  const handleNavChange = useCallback((state: { url: string }) => {
    if ((state.url ?? '').includes('/accounts/login')) {
      setIsLoggedIn(false);
      setUserId(null);
      setFullScreen(true);
    }
  }, []);

  const call = useCallback((jsCode: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const timer = setTimeout(() => {
        pending.current.delete(id);
        reject(new Error('Bridge call timed out'));
      }, 30_000);
      pending.current.set(id, { resolve, reject, timer });

      const code = jsCode.trim();
      const injection = `(function(){var __rid=${JSON.stringify(id)};Promise.resolve().then(function(){return(${code})}).then(function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:'bridge_result',requestId:__rid,payload:r,error:null}))}).catch(function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'bridge_result',requestId:__rid,payload:null,error:e&&e.message?e.message:String(e)}))})})();true;`;
      const dispatch = () => webViewRef.current?.injectJavaScript(injection);
      if (ready.current) dispatch();
      else queue.current.push(dispatch);
    });
  }, []);

  const showLogin = useCallback(() => setFullScreen(true), []);

  const forceRelogin = useCallback(() => {
    pending.current.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error('Session expired'));
    });
    pending.current.clear();
    queue.current.length = 0;
    webViewRef.current?.injectJavaScript(
      '(function(){try{localStorage.clear();sessionStorage.clear();}catch(e){}true;})();true;'
    );
    ready.current = false;
    setIsLoggedIn(false);
    setUserId(null);
    setFullScreen(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <BridgeContext.Provider value={{ call, isLoggedIn, userId, showLogin, forceRelogin }}>
      <View style={styles.container}>
        {children}
        <View style={fullScreen ? styles.fullScreen : styles.hidden} pointerEvents={fullScreen ? 'auto' : 'none'}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://www.instagram.com/' }}
            style={styles.flex}
            injectedJavaScript={BRIDGE_INIT_SCRIPT}
            onMessage={handleMessage}
            onLoadEnd={handleLoadEnd}
            onNavigationStateChange={handleNavChange}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            userAgent={DEVICE_USER_AGENT}
          />
        </View>
      </View>
    </BridgeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Off-screen but 1x1px — MUST have non-zero size or WKWebView on iOS freezes JS
  hidden: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
