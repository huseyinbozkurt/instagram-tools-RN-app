// Injected into the instagram.com WebView on every page load.
// Installs window.__RNBridge for RN to call via injectJavaScript.
// RULES: Must end with `true` at outer scope or iOS silently skips injection.

export const BRIDGE_INIT_SCRIPT = `
(function() {
  if (window.__RNBridgeInstalled) { reportAuth(); return; }
  window.__RNBridgeInstalled = true;

  window.__RNBridge = {
    execute: function(requestId, code) {
      Promise.resolve()
        .then(function() { return eval(code); })
        .then(function(result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bridge_result',
            requestId: requestId,
            payload: result,
            error: null,
          }));
        })
        .catch(function(err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bridge_result',
            requestId: requestId,
            payload: null,
            error: err && err.message ? err.message : String(err),
          }));
        });
    }
  };

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
