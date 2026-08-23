/*
 * Ra_FGOSharedFetch.js
 * @wiki / siroi_human 用 ページ取得共有キャッシュ
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.__RA_FGO_SHARED_FETCH__) return;
  window.__RA_FGO_SHARED_FETCH__ = true;

  const nativeFetch = window.fetch.bind(window);
  const cache = new Map();
  const pending = new Map();
  let hitCount = 0;
  let networkCount = 0;

  function cacheable(input, init) {
    let url = '';
    try {
      url = typeof input === 'string' ? input : input && input.url ? input.url : '';
      const absolute = new URL(url, location.href);
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      return method === 'GET' && absolute.origin === 'https://w.atwiki.jp' && absolute.pathname.indexOf('/siroi_human/pages/') === 0;
    } catch (_) {
      return false;
    }
  }

  function keyOf(input) {
    const url = typeof input === 'string' ? input : input.url;
    return new URL(url, location.href).href;
  }

  function responseFrom(entry) {
    return new Response(entry.body, {
      status: entry.status,
      statusText: entry.statusText,
      headers: entry.headers
    });
  }

  async function fetchAndStore(input, init, key) {
    networkCount += 1;
    const response = await nativeFetch(input, init);
    if (!response.ok) return response;

    const clone = response.clone();
    const body = await clone.text();
    const headers = {};
    clone.headers.forEach((value, name) => { headers[name] = value; });
    cache.set(key, {
      body,
      status: clone.status,
      statusText: clone.statusText,
      headers
    });
    return response;
  }

  window.fetch = function sharedFetch(input, init) {
    if (!cacheable(input, init)) return nativeFetch(input, init);

    const key = keyOf(input);
    if (cache.has(key)) {
      hitCount += 1;
      return Promise.resolve(responseFrom(cache.get(key)));
    }

    if (pending.has(key)) {
      hitCount += 1;
      return pending.get(key).then(() => responseFrom(cache.get(key)));
    }

    const request = fetchAndStore(input, init, key)
      .finally(() => pending.delete(key));
    pending.set(key, request.then(response => {
      if (!response.ok || !cache.has(key)) return response;
      return responseFrom(cache.get(key));
    }));
    return request;
  };

  window.RaFGOSharedFetch = Object.freeze({
    clear: () => cache.clear(),
    size: () => cache.size,
    stats: () => ({ cachedPages: cache.size, cacheHits: hitCount, networkRequests: networkCount })
  });
})();
