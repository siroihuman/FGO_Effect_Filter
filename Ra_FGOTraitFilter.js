/*
 * Ra_FGOTraitFilter.js
 * @wiki / siroi_human 用 サーヴァント特性検索モジュール
 * Author: argyi
 *
 * 個別サーヴァントページの「特性」欄を正本として読み込みます。
 * 「各特性持ち編集」ページは参照しません。
 */
(() => {
  'use strict';

  if (window.__RA_FGO_TRAIT_FILTER__) return;
  window.__RA_FGO_TRAIT_FILTER__ = true;

  const MODULE_VERSION = '0.1.0';
  const WIKI_ORIGIN = 'https://w.atwiki.jp';
  const WIKI_ROOT = '/siroi_human/';
  const INDEX_PATH = '/siroi_human/pages/54.html';
  const CACHE_KEY = `ra_fgo_trait_filter_${MODULE_VERSION}`;
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const CONCURRENCY = 6;
  const currentScript = document.currentScript;

  const CLASS_MAP = {
    '剣': 'セイバー', '弓': 'アーチャー', '槍': 'ランサー', '騎': 'ライダー',
    '術': 'キャスター', '殺': 'アサシン', '狂': 'バーサーカー', '盾': 'シールダー',
    '裁': 'ルーラー', '讐': 'アヴェンジャー', '月': 'ムーンキャンサー', '分': 'アルターエゴ',
    '降': 'フォーリナー', '詐': 'プリテンダー', '獣': 'ビースト'
  };

  const RARITY_BY_COLUMN = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

  const state = {
    servants: [],
    selectedTraits: new Set(),
    traitMode: 'and',
    loaded: false
  };

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeTraitName(value) {
    return normalizeText(value)
      .replace(/[（(][^）)]*[）)]\s*$/, '')
      .replace(/[［\[][^］\]]*[］\]]\s*$/, '')
      .trim();
  }

  function parseTraitToken(token) {
    const raw = normalizeText(token);
    if (!raw) return null;
    const name = normalizeTraitName(raw);
    if (!name) return null;
    return {
      name,
      raw,
      condition: raw === name ? '' : raw.slice(name.length).trim()
    };
  }

  function absoluteWikiUrl(href) {
    try {
      return new URL(href, WIKI_ORIGIN).href;
    } catch (_) {
      return '';
    }
  }

  function pageIdFromHref(href) {
    const m = String(href || '').match(/\/siroi_human\/pages\/(\d+)\.html/);
    return m ? m[1] : '';
  }

  async function fetchDocument(url) {
    const response = await fetch(url, { cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function findServantIndexTable(doc) {
    const tables = [...doc.querySelectorAll('table')];
    return tables.find(table => {
      const text = normalizeText(table.textContent);
      return text.includes('C★') && text.includes('UC★★') && text.includes('SR★★★★') && text.includes('SSR★★★★★');
    }) || null;
  }

  function parseIndex(doc) {
    const table = findServantIndexTable(doc);
    if (!table) throw new Error('サーヴァント一覧表を検出できませんでした。');

    const seen = new Set();
    const result = [];

    [...table.querySelectorAll('tr')].forEach(row => {
      const cells = [...row.children].filter(el => /^(TD|TH)$/.test(el.tagName));
      if (cells.length < 2) return;

      const classShort = normalizeText(cells[0].textContent).replace(/\s/g, '');
      const className = CLASS_MAP[classShort];
      if (!className) return;

      cells.slice(1, 6).forEach((cell, index) => {
        const rarity = RARITY_BY_COLUMN[index + 1] || null;
        [...cell.querySelectorAll('a[href]')].forEach(anchor => {
          const href = anchor.getAttribute('href') || '';
          const pageId = pageIdFromHref(href);
          if (!pageId || seen.has(pageId)) return;

          const name = normalizeText(anchor.textContent);
          if (!name || name === 'Image') return;

          seen.add(pageId);
          result.push({
            id: pageId,
            name,
            className,
            rarity,
            url: absoluteWikiUrl(href),
            traits: []
          });
        });
      });
    });

    if (!result.length) throw new Error('サーヴァントを一覧ページから取得できませんでした。');
    return result;
  }

  function findTraitCell(doc) {
    const rows = [...doc.querySelectorAll('tr')];
    for (const row of rows) {
      const cells = [...row.children].filter(el => /^(TD|TH)$/.test(el.tagName));
      if (cells.length < 2) continue;
      if (normalizeText(cells[0].textContent) === '特性') return cells[cells.length - 1];
    }
    return null;
  }

  function parseTraitsFromDocument(doc) {
    const cell = findTraitCell(doc);
    if (!cell) return [];

    const text = normalizeText(cell.textContent);
    const pieces = text.split(/\s*[/／]\s*/).map(parseTraitToken).filter(Boolean);
    const unique = new Map();
    pieces.forEach(item => {
      const key = `${item.name}\u0000${item.condition}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()];
  }

  async function mapLimit(items, limit, worker, onProgress) {
    const result = new Array(items.length);
    let next = 0;
    let done = 0;

    async function runner() {
      while (true) {
        const index = next++;
        if (index >= items.length) return;
        try {
          result[index] = await worker(items[index], index);
        } catch (error) {
          console.warn('[Ra_FGOTraitFilter] 個別ページ解析失敗', items[index], error);
          result[index] = { ...items[index], traits: [], error: String(error?.message || error) };
        }
        done += 1;
        if (onProgress) onProgress(done, items.length);
      }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
    return result;
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (!cache || !Array.isArray(cache.servants)) return null;
      if (Date.now() - Number(cache.savedAt || 0) > CACHE_TTL) return null;
      return cache.servants;
    } catch (_) {
      return null;
    }
  }

  function saveCache(servants) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), servants }));
    } catch (error) {
      console.warn('[Ra_FGOTraitFilter] キャッシュ保存に失敗しました。', error);
    }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  function getAllTraitNames() {
    return [...new Set(state.servants.flatMap(s => s.traits.map(t => t.name)))]
      .sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function servantHasTrait(servant, trait) {
    return servant.traits.some(item => item.name === trait);
  }

  function matchesServant(servant, filters) {
    if (filters.name && !servant.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.className && servant.className !== filters.className) return false;
    if (filters.rarity && servant.rarity !== Number(filters.rarity)) return false;

    const traits = [...state.selectedTraits];
    if (!traits.length) return true;
    if (state.traitMode === 'or') return traits.some(trait => servantHasTrait(servant, trait));
    return traits.every(trait => servantHasTrait(servant, trait));
  }

  function createElement(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') el.className = value;
      else if (key === 'style') el.style.cssText = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, String(value));
    });
    if (text) el.textContent = text;
    return el;
  }

  function mountPoint() {
    if (currentScript?.parentNode) return { parent: currentScript.parentNode, before: currentScript.nextSibling };
    return { parent: document.querySelector('#content, main, .atwiki-page-body, .wiki-body, .atwiki-body') || document.body, before: null };
  }

  const root = createElement('section', {
    id: 'ra-fgo-trait-filter',
    style: 'margin:16px 0;padding:14px;border:1px solid #bbb;border-radius:8px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;'
  });

  const title = createElement('h2', { style: 'margin:0 0 10px;font-size:20px;' }, 'サーヴァント特性検索');
  const note = createElement('p', { style: 'margin:0 0 12px;font-size:13px;color:#555;' }, '個別サーヴァントページの「特性」欄を直接読み取って検索します。');
  const controls = createElement('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;' });
  const loadButton = createElement('button', { type: 'button' }, 'データ読込');
  const reloadButton = createElement('button', { type: 'button' }, '再読込');
  const progress = createElement('span', { style: 'font-size:13px;color:#555;' }, '未読込');

  controls.append(loadButton, reloadButton, progress);

  const filterArea = createElement('div', { style: 'display:none;' });
  const basicRow = createElement('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;' });

  const nameInput = createElement('input', { type: 'search', placeholder: 'サーヴァント名', style: 'min-width:180px;padding:5px 7px;' });
  const classSelect = createElement('select', { style: 'padding:5px 7px;' });
  classSelect.append(createElement('option', { value: '' }, '全クラス'));
  Object.values(CLASS_MAP).forEach(name => classSelect.append(createElement('option', { value: name }, name)));

  const raritySelect = createElement('select', { style: 'padding:5px 7px;' });
  raritySelect.append(createElement('option', { value: '' }, '全レアリティ'));
  [1, 2, 3, 4, 5].forEach(r => raritySelect.append(createElement('option', { value: r }, `★${r}`)));

  basicRow.append(nameInput, classSelect, raritySelect);

  const modeRow = createElement('div', { style: 'display:flex;gap:14px;align-items:center;margin:8px 0;font-size:14px;' });
  const andLabel = createElement('label');
  const andRadio = createElement('input', { type: 'radio', name: 'ra-trait-mode', value: 'and', checked: 'checked' });
  andLabel.append(andRadio, document.createTextNode(' 選択特性をすべて持つ（AND）'));
  const orLabel = createElement('label');
  const orRadio = createElement('input', { type: 'radio', name: 'ra-trait-mode', value: 'or' });
  orLabel.append(orRadio, document.createTextNode(' いずれかを持つ（OR）'));
  modeRow.append(andLabel, orLabel);

  const traitSearch = createElement('input', { type: 'search', placeholder: '特性名を絞り込み', style: 'width:100%;max-width:360px;padding:5px 7px;margin:6px 0;' });
  const traitBox = createElement('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px 10px;max-height:360px;overflow:auto;padding:8px;border:1px solid #ddd;border-radius:6px;' });
  const actionRow = createElement('div', { style: 'display:flex;gap:8px;margin:10px 0;' });
  const searchButton = createElement('button', { type: 'button' }, '検索');
  const clearButton = createElement('button', { type: 'button' }, '条件を解除');
  actionRow.append(searchButton, clearButton);

  const resultSummary = createElement('div', { style: 'font-weight:700;margin:10px 0 6px;' });
  const resultBox = createElement('div');

  filterArea.append(basicRow, modeRow, traitSearch, traitBox, actionRow, resultSummary, resultBox);
  root.append(title, note, controls, filterArea);

  const mount = mountPoint();
  mount.parent.insertBefore(root, mount.before);

  function renderTraits(filterText = '') {
    const needle = normalizeText(filterText).toLowerCase();
    traitBox.innerHTML = '';
    const names = getAllTraitNames().filter(name => !needle || name.toLowerCase().includes(needle));

    names.forEach(name => {
      const label = createElement('label', { style: 'display:flex;gap:5px;align-items:flex-start;font-size:13px;' });
      const checkbox = createElement('input', { type: 'checkbox', value: name });
      checkbox.checked = state.selectedTraits.has(name);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selectedTraits.add(name);
        else state.selectedTraits.delete(name);
      });
      label.append(checkbox, document.createTextNode(name));
      traitBox.append(label);
    });
  }

  function renderResults() {
    if (!state.loaded) return;
    const filters = {
      name: normalizeText(nameInput.value),
      className: classSelect.value,
      rarity: raritySelect.value
    };
    const matches = state.servants.filter(servant => matchesServant(servant, filters));
    resultSummary.textContent = `検索結果：${matches.length}騎`;
    resultBox.innerHTML = '';

    if (!matches.length) {
      resultBox.append(createElement('p', {}, '該当するサーヴァントはいません。'));
      return;
    }

    matches.forEach(servant => {
      const item = createElement('div', { style: 'padding:8px 4px;border-top:1px solid #eee;' });
      const link = createElement('a', { href: servant.url, target: '_blank', rel: 'noopener noreferrer' }, servant.name);
      const head = createElement('div', { style: 'font-weight:700;' });
      head.append(document.createTextNode(`★${servant.rarity} ${servant.className}　`), link);

      const selected = [...state.selectedTraits];
      const traitText = servant.traits.map(item => {
        const hit = selected.includes(item.name);
        return hit ? `【${item.raw}】` : item.raw;
      }).join(' / ');
      const traits = createElement('div', { style: 'font-size:12px;color:#555;margin-top:3px;' }, traitText || '特性データなし');
      item.append(head, traits);
      resultBox.append(item);
    });
  }

  async function loadData(force = false) {
    loadButton.disabled = true;
    reloadButton.disabled = true;
    progress.textContent = '一覧を取得中…';

    try {
      if (!force) {
        const cached = loadCache();
        if (cached) {
          state.servants = cached;
          state.loaded = true;
          progress.textContent = `キャッシュ読込済み：${cached.length}騎`;
          filterArea.style.display = '';
          renderTraits(traitSearch.value);
          renderResults();
          return;
        }
      }

      if (force) clearCache();
      const indexDoc = await fetchDocument(`${WIKI_ORIGIN}${INDEX_PATH}`);
      const baseServants = parseIndex(indexDoc);
      progress.textContent = `個別ページ解析中：0 / ${baseServants.length}`;

      const servants = await mapLimit(
        baseServants,
        CONCURRENCY,
        async servant => {
          const doc = await fetchDocument(servant.url);
          return { ...servant, traits: parseTraitsFromDocument(doc) };
        },
        (done, total) => { progress.textContent = `個別ページ解析中：${done} / ${total}`; }
      );

      state.servants = servants;
      state.loaded = true;
      saveCache(servants);
      progress.textContent = `読込完了：${servants.length}騎 / 特性${getAllTraitNames().length}種`;
      filterArea.style.display = '';
      renderTraits();
      renderResults();
    } catch (error) {
      console.error('[Ra_FGOTraitFilter] データ読込失敗', error);
      progress.textContent = `読込失敗：${error?.message || error}`;
    } finally {
      loadButton.disabled = false;
      reloadButton.disabled = false;
    }
  }

  loadButton.addEventListener('click', () => loadData(false));
  reloadButton.addEventListener('click', () => loadData(true));
  searchButton.addEventListener('click', renderResults);
  nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') renderResults(); });
  traitSearch.addEventListener('input', () => renderTraits(traitSearch.value));
  andRadio.addEventListener('change', () => { if (andRadio.checked) state.traitMode = 'and'; });
  orRadio.addEventListener('change', () => { if (orRadio.checked) state.traitMode = 'or'; });
  clearButton.addEventListener('click', () => {
    state.selectedTraits.clear();
    nameInput.value = '';
    classSelect.value = '';
    raritySelect.value = '';
    traitSearch.value = '';
    andRadio.checked = true;
    orRadio.checked = false;
    state.traitMode = 'and';
    renderTraits();
    renderResults();
  });

  window.RaFGOTraitFilter = Object.freeze({
    version: MODULE_VERSION,
    load: loadData,
    getServants: () => state.servants.map(servant => ({ ...servant, traits: servant.traits.map(t => ({ ...t })) })),
    getTraitNames: getAllTraitNames,
    normalizeTraitName
  });
})();
