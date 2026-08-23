/*
 * Ra_FGOTraitFilterCore.js
 * @wiki / siroi_human 用 サーヴァント特性検索（共通基盤利用版）
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.__RA_FGO_TRAIT_FILTER_CORE__) return;
  window.__RA_FGO_TRAIT_FILTER_CORE__ = true;

  const core = window.RaFGODataCore;
  if (!core) {
    const box = document.createElement('div');
    box.style.cssText = 'margin:12px 0;padding:10px 12px;border:1px solid #c66;background:#fff4f4;color:#822;border-radius:6px;font-family:sans-serif;';
    box.textContent = '特性検索の共通データ基盤を読み込めませんでした。Ra_FGODataCore.js を先に読み込んでください。';
    (document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body).appendChild(box);
    return;
  }

  const VERSION = '0.2.0-dev';
  const CACHE_KEY = `ra_fgo_trait_filter_core_${VERSION}`;
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const currentScript = document.currentScript;

  const state = {
    servants: [],
    selectedTraits: new Set(),
    traitMode: 'and',
    loaded: false
  };

  function normalizeTraitName(value) {
    return core.normalizeText(value)
      .replace(/[（(][^）)]*[）)]\s*$/, '')
      .replace(/[［\[][^］\]]*[］\]]\s*$/, '')
      .trim();
  }

  function parseTraitToken(token) {
    const raw = core.normalizeText(token);
    if (!raw) return null;
    const name = normalizeTraitName(raw);
    if (!name) return null;
    return {
      name,
      raw,
      condition: raw === name ? '' : raw.slice(name.length).trim()
    };
  }

  function findTraitCell(doc) {
    const rows = Array.from(doc.querySelectorAll('tr'));
    for (const row of rows) {
      const cells = Array.from(row.children).filter(el => /^(TD|TH)$/.test(el.tagName));
      if (cells.length < 2) continue;
      if (core.normalizeText(cells[0].textContent) === '特性') return cells[cells.length - 1];
    }
    return null;
  }

  function parseTraits(doc) {
    const cell = findTraitCell(doc);
    if (!cell) return [];

    const pieces = core.normalizeText(cell.textContent)
      .split(/\s*[/／]\s*/)
      .map(parseTraitToken)
      .filter(Boolean);

    const unique = new Map();
    pieces.forEach(item => {
      const key = `${item.name}\u0000${item.condition}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }

  function getTraitNames() {
    return Array.from(new Set(state.servants.flatMap(servant => servant.traits.map(item => item.name))))
      .sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function hasTrait(servant, trait) {
    return servant.traits.some(item => item.name === trait);
  }

  function matches(servant, filters) {
    if (filters.name && !servant.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.className && servant.className !== filters.className) return false;
    if (filters.rarity && servant.rarity !== Number(filters.rarity)) return false;

    const traits = Array.from(state.selectedTraits);
    if (!traits.length) return true;
    if (state.traitMode === 'or') return traits.some(trait => hasTrait(servant, trait));
    return traits.every(trait => hasTrait(servant, trait));
  }

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'style') node.style.cssText = value;
      else node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  }

  function mountPoint() {
    if (currentScript && currentScript.parentNode) return { parent: currentScript.parentNode, before: currentScript.nextSibling };
    return { parent: document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body, before: null };
  }

  const root = el('section', {
    id: 'ra-fgo-trait-filter',
    style: 'margin:16px 0;padding:14px;border:1px solid #bbb;border-radius:8px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;'
  });

  const title = el('h2', { style: 'margin:0 0 10px;font-size:20px;' }, 'サーヴァント特性検索');
  const note = el('p', { style: 'margin:0 0 12px;font-size:13px;color:#555;' }, `共通データ基盤版 ${VERSION}`);
  const controls = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;' });
  const loadButton = el('button', { type: 'button' }, 'データ読込');
  const reloadButton = el('button', { type: 'button' }, '再読込');
  const progress = el('span', { style: 'font-size:13px;color:#555;' }, '未読込');
  controls.append(loadButton, reloadButton, progress);

  const filterArea = el('div', { style: 'display:none;' });
  const basicRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;' });
  const nameInput = el('input', { type: 'search', placeholder: 'サーヴァント名', style: 'min-width:180px;padding:5px 7px;' });
  const classSelect = el('select', { style: 'padding:5px 7px;' });
  classSelect.append(el('option', { value: '' }, '全クラス'));
  Object.values(core.classMap).forEach(name => classSelect.append(el('option', { value: name }, name)));
  const raritySelect = el('select', { style: 'padding:5px 7px;' });
  raritySelect.append(el('option', { value: '' }, '全レアリティ'));
  [1, 2, 3, 4, 5].forEach(rarity => raritySelect.append(el('option', { value: rarity }, `★${rarity}`)));
  basicRow.append(nameInput, classSelect, raritySelect);

  const modeRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin:8px 0;font-size:14px;' });
  const andLabel = el('label');
  const andRadio = el('input', { type: 'radio', name: 'ra-trait-core-mode', value: 'and', checked: 'checked' });
  andLabel.append(andRadio, document.createTextNode(' 選択特性をすべて持つ（AND）'));
  const orLabel = el('label');
  const orRadio = el('input', { type: 'radio', name: 'ra-trait-core-mode', value: 'or' });
  orLabel.append(orRadio, document.createTextNode(' いずれかを持つ（OR）'));
  modeRow.append(andLabel, orLabel);

  const traitSearch = el('input', { type: 'search', placeholder: '特性名を絞り込み', style: 'width:100%;max-width:360px;padding:5px 7px;margin:6px 0;' });
  const traitBox = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px 10px;max-height:360px;overflow:auto;padding:8px;border:1px solid #ddd;border-radius:6px;' });
  const actionRow = el('div', { style: 'display:flex;gap:8px;margin:10px 0;' });
  const searchButton = el('button', { type: 'button' }, '検索');
  const clearButton = el('button', { type: 'button' }, '条件を解除');
  actionRow.append(searchButton, clearButton);

  const resultSummary = el('div', { style: 'font-weight:700;margin:10px 0 6px;' });
  const resultBox = el('div');
  filterArea.append(basicRow, modeRow, traitSearch, traitBox, actionRow, resultSummary, resultBox);
  root.append(title, note, controls, filterArea);

  const mount = mountPoint();
  mount.parent.insertBefore(root, mount.before);

  function renderTraits(filterText = '') {
    const needle = core.normalizeText(filterText).toLowerCase();
    traitBox.innerHTML = '';
    getTraitNames()
      .filter(name => !needle || name.toLowerCase().includes(needle))
      .forEach(name => {
        const label = el('label', { style: 'display:flex;gap:5px;align-items:flex-start;font-size:13px;' });
        const checkbox = el('input', { type: 'checkbox', value: name });
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
      name: core.normalizeText(nameInput.value),
      className: classSelect.value,
      rarity: raritySelect.value
    };
    const matched = state.servants.filter(servant => matches(servant, filters));
    resultSummary.textContent = `検索結果：${matched.length}騎`;
    resultBox.innerHTML = '';

    if (!matched.length) {
      resultBox.append(el('p', {}, '該当するサーヴァントはいません。'));
      return;
    }

    matched.forEach(servant => {
      const item = el('div', { style: 'padding:8px 4px;border-top:1px solid #eee;' });
      const head = el('div', { style: 'font-weight:700;' });
      const link = el('a', { href: servant.url, target: '_blank', rel: 'noopener noreferrer' }, servant.name);
      head.append(document.createTextNode(`★${servant.rarity} ${servant.className}　`), link);

      const selected = Array.from(state.selectedTraits);
      const traitText = servant.traits.map(entry => selected.includes(entry.name) ? `【${entry.raw}】` : entry.raw).join(' / ');
      item.append(head, el('div', { style: 'font-size:12px;color:#555;margin-top:3px;' }, traitText || '特性データなし'));
      resultBox.append(item);
    });
  }

  async function loadData(force = false) {
    loadButton.disabled = true;
    reloadButton.disabled = true;
    progress.textContent = '一覧を取得中…';

    try {
      if (!force) {
        const cached = core.readCache(CACHE_KEY, CACHE_TTL);
        if (cached && Array.isArray(cached)) {
          state.servants = cached;
          state.loaded = true;
          progress.textContent = `キャッシュ読込済み：${cached.length}騎`;
          filterArea.style.display = '';
          renderTraits(traitSearch.value);
          renderResults();
          return;
        }
      }

      if (force) core.clearCache(CACHE_KEY);
      const servants = await core.loadServantIndex();
      progress.textContent = `個別ページ解析中：0 / ${servants.length}`;

      const fetched = await core.loadServantDocuments(servants, {
        concurrency: 6,
        continueOnError: true,
        onProgress(done, total) {
          progress.textContent = `個別ページ解析中：${done} / ${total}`;
        }
      });

      state.servants = fetched.map(entry => ({
        ...entry.servant,
        traits: entry.document ? parseTraits(entry.document) : [],
        error: entry.error || ''
      }));
      state.loaded = true;
      core.writeCache(CACHE_KEY, state.servants);
      progress.textContent = `読込完了：${state.servants.length}騎 / 特性${getTraitNames().length}種`;
      filterArea.style.display = '';
      renderTraits();
      renderResults();
    } catch (error) {
      console.error('[Ra_FGOTraitFilterCore] データ読込失敗', error);
      progress.textContent = `読込失敗：${error && error.message ? error.message : error}`;
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

  window.RaFGOTraitFilterCore = Object.freeze({
    version: VERSION,
    load: loadData,
    getServants: () => state.servants.map(servant => ({ ...servant, traits: servant.traits.map(item => ({ ...item })) })),
    getTraitNames,
    normalizeTraitName
  });
})();
