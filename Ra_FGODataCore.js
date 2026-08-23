/*
 * Ra_FGODataCore.js
 * @wiki / siroi_human 用 共通データ取得基盤
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.RaFGODataCore) return;

  const VERSION = '0.1.0';
  const WIKI_ORIGIN = 'https://w.atwiki.jp';
  const INDEX_PATH = '/siroi_human/pages/54.html';
  const DEFAULT_CONCURRENCY = 6;

  const CLASS_MAP = Object.freeze({
    '剣': 'セイバー', '弓': 'アーチャー', '槍': 'ランサー', '騎': 'ライダー',
    '術': 'キャスター', '殺': 'アサシン', '狂': 'バーサーカー', '盾': 'シールダー',
    '裁': 'ルーラー', '讐': 'アヴェンジャー', '月': 'ムーンキャンサー', '分': 'アルターエゴ',
    '降': 'フォーリナー', '詐': 'プリテンダー', '獣': 'ビースト'
  });

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function absoluteWikiUrl(href) {
    try {
      return new URL(href, WIKI_ORIGIN).href;
    } catch (_) {
      return '';
    }
  }

  function pageIdFromHref(href) {
    const match = String(href || '').match(/\/siroi_human\/pages\/(\d+)\.html/);
    return match ? match[1] : '';
  }

  async function fetchDocument(url) {
    const response = await fetch(url, { cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function findServantIndexTable(doc) {
    const tables = Array.from(doc.querySelectorAll('table'));
    return tables.find(table => {
      const text = normalizeText(table.textContent);
      return text.includes('C★') && text.includes('UC★★') && text.includes('SR★★★★') && text.includes('SSR★★★★★');
    }) || null;
  }

  function parseServantIndex(doc) {
    const table = findServantIndexTable(doc);
    if (!table) throw new Error('サーヴァント一覧表を検出できませんでした。');

    const rarityByColumn = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    const seen = new Set();
    const result = [];

    Array.from(table.querySelectorAll('tr')).forEach(row => {
      const cells = Array.from(row.children).filter(el => /^(TD|TH)$/.test(el.tagName));
      if (cells.length < 2) return;

      const classShort = normalizeText(cells[0].textContent).replace(/\s/g, '');
      const className = CLASS_MAP[classShort];
      if (!className) return;

      cells.slice(1, 6).forEach((cell, index) => {
        const rarity = rarityByColumn[index + 1] || null;
        Array.from(cell.querySelectorAll('a[href]')).forEach(anchor => {
          const href = anchor.getAttribute('href') || '';
          const id = pageIdFromHref(href);
          if (!id || seen.has(id)) return;

          const name = normalizeText(anchor.textContent);
          if (!name || name === 'Image') return;

          seen.add(id);
          result.push({ id, name, className, rarity, url: absoluteWikiUrl(href) });
        });
      });
    });

    if (!result.length) throw new Error('サーヴァントを一覧ページから取得できませんでした。');
    return result;
  }

  async function loadServantIndex() {
    const doc = await fetchDocument(`${WIKI_ORIGIN}${INDEX_PATH}`);
    return parseServantIndex(doc);
  }

  async function mapLimit(items, limit, worker, onProgress) {
    const result = new Array(items.length);
    let next = 0;
    let done = 0;

    async function runner() {
      while (true) {
        const index = next;
        next += 1;
        if (index >= items.length) return;

        result[index] = await worker(items[index], index);
        done += 1;
        if (onProgress) onProgress(done, items.length);
      }
    }

    const count = Math.max(1, Math.min(Number(limit) || DEFAULT_CONCURRENCY, items.length || 1));
    await Promise.all(Array.from({ length: count }, runner));
    return result;
  }

  async function loadServantDocuments(servants, options = {}) {
    const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const continueOnError = options.continueOnError !== false;

    return mapLimit(servants, concurrency, async servant => {
      try {
        return { servant, document: await fetchDocument(servant.url), error: '' };
      } catch (error) {
        if (!continueOnError) throw error;
        return { servant, document: null, error: String(error && error.message ? error.message : error) };
      }
    }, onProgress);
  }

  function readCache(key, ttl) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !('data' in parsed)) return null;
      if (ttl && Date.now() - Number(parsed.savedAt || 0) > ttl) return null;
      return parsed.data;
    } catch (_) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearCache(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  window.RaFGODataCore = Object.freeze({
    version: VERSION,
    wikiOrigin: WIKI_ORIGIN,
    indexPath: INDEX_PATH,
    classMap: CLASS_MAP,
    normalizeText,
    absoluteWikiUrl,
    pageIdFromHref,
    fetchDocument,
    parseServantIndex,
    loadServantIndex,
    mapLimit,
    loadServantDocuments,
    readCache,
    writeCache,
    clearCache
  });
})();
