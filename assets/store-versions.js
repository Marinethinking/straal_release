(function () {
  var APP_STORE_ID = '6782097341';
  var PLAY_PACKAGE = 'com.marinethinking.straal';

  // Deploy workers/play-version-proxy.js to Cloudflare Workers, then set this URL.
  // Example: 'https://straal-play-version.<your-subdomain>.workers.dev'
  var PLAY_VERSION_PROXY = '';

  function formatVersion(version) {
    return version.indexOf('v') === 0 ? version : 'v' + version;
  }

  function setStoreVersion(store, version) {
    if (!version) return;

    var formatted = formatVersion(version);

    document.querySelectorAll('[data-store="' + store + '"]').forEach(function (el) {
      el.textContent = formatted;
    });

    document.querySelectorAll('[data-store-card="' + store + '"]').forEach(function (el) {
      var prefix = el.getAttribute('data-label-prefix');
      if (prefix) el.setAttribute('aria-label', prefix + ' ' + formatted);
    });
  }

  function getS3Version() {
    var row = document.querySelector('[data-s3-version]');
    return row ? row.getAttribute('data-s3-version') : null;
  }

  function applyS3Fallback() {
    var version = getS3Version();
    if (!version) return;
    setStoreVersion('ios', version);
    setStoreVersion('play', version);
    setStoreVersion('apk', version);
  }

  function fetchAppStoreVersion() {
    return new Promise(function (resolve) {
      var callbackName = '_itunesLookup_' + Date.now();
      var script;
      var timeoutId = setTimeout(function () {
        cleanup();
        resolve(null);
      }, 8000);

      function cleanup() {
        clearTimeout(timeoutId);
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve((data && data.results && data.results[0] && data.results[0].version) || null);
      };

      script = document.createElement('script');
      script.src =
        'https://itunes.apple.com/lookup?id=' +
        encodeURIComponent(APP_STORE_ID) +
        '&callback=' +
        callbackName;
      script.onerror = function () {
        cleanup();
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  function fetchPlayStoreVersion() {
    if (!PLAY_VERSION_PROXY) return Promise.resolve(null);

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 8000);

    return fetch(
      PLAY_VERSION_PROXY + '?id=' + encodeURIComponent(PLAY_PACKAGE),
      { signal: controller.signal, cache: 'no-store' }
    )
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        return (data && data.version) || null;
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        clearTimeout(timeoutId);
      });
  }

  function init() {
    applyS3Fallback();

    Promise.all([fetchAppStoreVersion(), fetchPlayStoreVersion()]).then(function (results) {
      if (results[0]) setStoreVersion('ios', results[0]);
      if (results[1]) setStoreVersion('play', results[1]);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
