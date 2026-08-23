/*
 * Ra_FGOCombinedSearch.js
 * @wiki / siroi_human 用 特性・効果 統合検索UI
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.__RA_FGO_COMBINED_SEARCH__) return;
  window.__RA_FGO_COMBINED_SEARCH__ = true;

  const core = window.RaFGODataCore;
  const unifiedApi = window.RaFGOUnifiedData;
  if (!core || !unifiedApi) return;

  const VERSION = '0.1.0-dev';
  const state = {
    servants: [],
    selectedTraits: new Set(),
    traitMode: 'and',
    effectMode: 'and'
  };

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'style') node.style.cssText = value;
      else node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  }

  function normalize(value) {
    return core.normalizeText(value).toLowerCase();
  }

  function traitName(entry) {
    if (typeof entry === 'string') return core.normalizeText(entry);
    return core.normalizeText(entry && (entry.name || entry.raw) || '');
  }

  function effectStrings(value, depth = 0, found = []) {
    if (depth > 6 || value == null) return found;
    if (typeof value === 'string') {
      const text = core.normalizeText(value);
      if (text && text.length >= 2 && text.length <= 300) found.push(text);
      return found;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return found;
    if (Array.isArray(value)) {
      value.forEach(item => effectStrings(item, depth + 1, found));
      return found;
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (/^(url|href|id|pageId|page_id|className|class_name|rarity|rare)$/i.test(key)) return;
        effectStrings(value[key], depth + 1, found);
      });
    }
    return found;
  }

  function effectText(servant) {
    return Array.from(new Set(effectStrings(servant.effects))).join(' / ');
  }

  function effectTerms() {
    return effectInput.value
      .split(/[\n,、]+/)
      .map(core.normalizeText)
      .filter(Boolean);
  }

  function getTraitNames() {
    const names = [];
    state.servants.forEach(servant => {
      (servant.traits || []).forEach(entry => {
        const name = traitName(entry);
        if (name) names.push(name);
      });
    });
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function hasTrait(servant, name) {
    return (servant.traits || []).some(entry => traitName(entry) === name);
  }

  function matches(servant) {
    const name = normalize(nameInput.value);
    if (name && !normalize(servant.name).includes(name)) return false;
    if (classSelect.value && servant.className !== classSelect.value) return false;
    if (raritySelect.value && Number(servant.rarity) !== Number(raritySelect.value)) return false;

    const traits = Array.from(state.selectedTraits);
    if (traits.length) {
      const traitMatched = state.traitMode === 'or'
        ? traits.some(item => hasTrait(servant, item))
        : traits.every(item => hasTrait(servant, item));
      if (!traitMatched) return false;
    }

    const terms = effectTerms();
    if (terms.length) {
      const haystack = normalize(effectText(servant));
      const effectMatched = state.effectMode === 'or'
        ? terms.some(term => haystack.includes(normalize(term)))
        : terms.every(term => haystack.includes(normalize(term)));
      if (!effectMatched) return false;
    }

    return true;
  }

  const root = el('section', {
    id: 'ra-fgo-combined-search',
    style: 'margin:16px 0;padding:14px;border:2px solid #999;border-radius:8px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;'
  });
  root.appendChild(el('h2', { style: 'margin:0 0 6px;font-size:20px;' }, 'サーヴァント総合絞り込み'));
  root.appendChild(el('div', { style: 'margin-bottom:12px;font-size:12px;color:#555;' }, '統合検索UI ' + VERSION + '　特性とスキル・宝具効果を同時に指定できます。'));

  const dataStatus = el('div', { style: 'margin-bottom:10px;font-size:13px;font-weight:700;' }, '統合データ未読込');
  root.appendChild(dataStatus);

  const basic = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;' });
  const nameInput = el('input', { type: 'search', placeholder: 'サーヴァント名', style: 'min-width:180px;padding:5px 7px;' });
  const classSelect = el('select', { style: 'padding:5px 7px;' });
  classSelect.appendChild(el('option', { value: '' }, '全クラス'));
  Object.values(core.classMap).forEach(name => classSelect.appendChild(el('option', { value: name }, name)));
  const raritySelect = el('select', { style: 'padding:5px 7px;' });
  raritySelect.appendChild(el('option', { value: '' }, '全レアリティ'));
  [1, 2, 3, 4, 5].forEach(rarity => raritySelect.appendChild(el('option', { value: rarity }, '★' + rarity)));
  basic.append(nameInput, classSelect, raritySelect);
  root.appendChild(basic);

  root.appendChild(el('h3', { style: 'margin:10px 0 4px;font-size:16px;' }, '特性'));
  const traitMode = el('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:6px;font-size:13px;' });
  const traitAnd = el('input', { type: 'radio', name: 'ra-combined-trait-mode', checked: 'checked' });
  const traitAndLabel = el('label'); traitAndLabel.append(traitAnd, document.createTextNode(' すべて持つ（AND）'));
  const traitOr = el('input', { type: 'radio', name: 'ra-combined-trait-mode' });
  const traitOrLabel = el('label'); traitOrLabel.append(traitOr, document.createTextNode(' いずれかを持つ（OR）'));
  traitMode.append(traitAndLabel, traitOrLabel);
  root.appendChild(traitMode);
  const traitSearch = el('input', { type: 'search', placeholder: '特性名を絞り込み', style: 'width:100%;max-width:360px;padding:5px 7px;margin-bottom:6px;' });
  const traitBox = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px 10px;max-height:300px;overflow:auto;padding:8px;border:1px solid #ddd;border-radius:6px;' });
  root.append(traitSearch, traitBox);

  root.appendChild(el('h3', { style: 'margin:14px 0 4px;font-size:16px;' }, 'スキル・宝具効果'));
  const effectInput = el('textarea', { rows: '2', placeholder: '例：NP増加, 攻撃力アップ\n複数指定はカンマまたは改行で区切ります', style: 'width:100%;box-sizing:border-box;padding:6px 8px;' });
  const effectModeRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;margin:6px 0;font-size:13px;' });
  const effectAnd = el('input', { type: 'radio', name: 'ra-combined-effect-mode', checked: 'checked' });
  const effectAndLabel = el('label'); effectAndLabel.append(effectAnd, document.createTextNode(' すべて含む（AND）'));
  const effectOr = el('input', { type: 'radio', name: 'ra-combined-effect-mode' });
  const effectOrLabel = el('label'); effectOrLabel.append(effectOr, document.createTextNode(' いずれかを含む（OR）'));
  effectModeRow.append(effectAndLabel, effectOrLabel);
  root.append(effectInput, effectModeRow);

  const actions = el('div', { style: 'display:flex;gap:8px;margin:12px 0;' });
  const searchButton = el('button', { type: 'button' }, '総合検索');
  const clearButton = el('button', { type: 'button' }, '条件を解除');
  actions.append(searchButton, clearButton);
  root.appendChild(actions);

  const summary = el('div', { style: 'font-weight:700;margin:8px 0;' });
  const results = el('div');
  root.append(summary, results);

  const head = document.getElementById('ra-fgo-unified-filter-head');
  if (head && head.parentNode) head.parentNode.insertBefore(root, head.nextSibling);
  else (document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body).appendChild(root);

  function renderTraits() {
    const needle = normalize(traitSearch.value);
    traitBox.innerHTML = '';
    getTraitNames().filter(name => !needle || normalize(name).includes(needle)).forEach(name => {
      const label = el('label', { style: 'display:flex;gap:5px;align-items:flex-start;font-size:13px;' });
      const checkbox = el('input', { type: 'checkbox', value: name });
      checkbox.checked = state.selectedTraits.has(name);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selectedTraits.add(name);
        else state.selectedTraits.delete(name);
      });
      label.append(checkbox, document.createTextNode(name));
      traitBox.appendChild(label);
    });
  }

  function matchedEffectSnippets(servant) {
    const terms = effectTerms().map(normalize);
    if (!terms.length) return [];
    return Array.from(new Set(effectStrings(servant.effects)))
      .filter(text => terms.some(term => normalize(text).includes(term)))
      .slice(0, 8);
  }

  function renderResults() {
    if (!state.servants.length) {
      summary.textContent = '先に上部の「統合データ読込」を実行してください。';
      results.innerHTML = '';
      return;
    }
    const matched = state.servants.filter(matches);
    summary.textContent = '検索結果：' + matched.length + '騎';
    results.innerHTML = '';
    matched.forEach(servant => {
      const item = el('div', { style: 'padding:9px 4px;border-top:1px solid #eee;' });
      const line = el('div', { style: 'font-weight:700;' });
      line.append(document.createTextNode('★' + servant.rarity + ' ' + servant.className + '　'));
      line.appendChild(el('a', { href: servant.url, target: '_blank', rel: 'noopener noreferrer' }, servant.name));
      item.appendChild(line);
      const selectedTraits = Array.from(state.selectedTraits);
      if (selectedTraits.length) {
        const hits = (servant.traits || []).map(traitName).filter(name => selectedTraits.includes(name));
        item.appendChild(el('div', { style: 'font-size:12px;color:#555;margin-top:3px;' }, '特性一致：' + hits.join(' / ')));
      }
      const snippets = matchedEffectSnippets(servant);
      if (snippets.length) item.appendChild(el('div', { style: 'font-size:12px;color:#555;margin-top:3px;' }, '効果一致：' + snippets.join(' / ')));
      results.appendChild(item);
    });
  }

  function refreshData() {
    state.servants = unifiedApi.getServants() || [];
    dataStatus.textContent = state.servants.length
      ? '統合データ：' + state.servants.length + '騎 読込済み'
      : '統合データ未読込';
    renderTraits();
    renderResults();
  }

  traitSearch.addEventListener('input', renderTraits);
  traitAnd.addEventListener('change', () => { if (traitAnd.checked) state.traitMode = 'and'; });
  traitOr.addEventListener('change', () => { if (traitOr.checked) state.traitMode = 'or'; });
  effectAnd.addEventListener('change', () => { if (effectAnd.checked) state.effectMode = 'and'; });
  effectOr.addEventListener('change', () => { if (effectOr.checked) state.effectMode = 'or'; });
  searchButton.addEventListener('click', renderResults);
  nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') renderResults(); });
  clearButton.addEventListener('click', () => {
    state.selectedTraits.clear();
    state.traitMode = 'and';
    state.effectMode = 'and';
    nameInput.value = '';
    classSelect.value = '';
    raritySelect.value = '';
    traitSearch.value = '';
    effectInput.value = '';
    traitAnd.checked = true;
    traitOr.checked = false;
    effectAnd.checked = true;
    effectOr.checked = false;
    renderTraits();
    renderResults();
  });

  window.addEventListener('ra-fgo-unified-data-updated', refreshData);
  window.RaFGOCombinedSearch = Object.freeze({
    version: VERSION,
    refresh: refreshData,
    search: renderResults
  });

  refreshData();
})();
