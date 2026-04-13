// Injected into the instagram.com WebView on every page load.
// Handles auth detection; bridge calls are injected inline by WebViewBridge.
// RULES: Must end with `true` at outer scope or iOS silently skips injection.

export const BRIDGE_INIT_SCRIPT = `
(function() {
  if (window.__RNBridgeInstalled) { reportAuth(); return; }
  window.__RNBridgeInstalled = true;

  function reportAuth() {
    var dsMatch = document.cookie.match(/ds_user_id=(\\d+)/);
    if (dsMatch) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'auth_status', isLoggedIn: true, userId: dsMatch[1],
      }));
      return;
    }
    var csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
    fetch('/api/v1/accounts/current_user/?edit=true', {
      credentials: 'include',
      headers: {
        'x-csrftoken': csrf,
        'x-ig-app-id': '936619743392459',
        'x-requested-with': 'XMLHttpRequest',
      },
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var userId = data && data.user && (data.user.pk || data.user.id);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'auth_status', isLoggedIn: !!userId, userId: userId ? String(userId) : null,
      }));
    })
    .catch(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'auth_status', isLoggedIn: false, userId: null,
      }));
    });
  }

  reportAuth();
  true;
})();
true;
`;
