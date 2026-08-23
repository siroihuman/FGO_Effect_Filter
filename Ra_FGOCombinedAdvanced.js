/*
 * Ra_FGOCombinedAdvanced.js
 * @wiki / siroi_human 用 特性・効果 統合検索UI（詳細条件版）
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.__RA_FGO_COMBINED_ADVANCED__) return;
  window.__RA_FGO_COMBINED_ADVANCED__ = true;

  const core = window.RaFGODataCore;
  const unifiedApi = window.RaFGOUnifiedData;
  if (!core || !unifiedApi) return;

  const VERSION = '0.2.0-dev';
  const current = document.currentScript;
  const state = { servants: [], selectedTraits: new Set(), traitMode: 'and', effectMode: 'and', effectOptions: [] };

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'style') node.style.cssText = value;
      else node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  }

  function normalize(value) { return core.normalizeText(value).toLowerCase(); }
  function traitName(entry) {
    if (typeof entry === 'string') return core.normalizeText(entry);
    return core.normalizeText(entry && (entry.name || entry.raw) || '');
  }

  function effectRows(value, path = '', depth = 0, found = []) {
    if (depth > 7 || value == null) return found;
    if (typeof value === 'string') {
      const text = core.normalizeText(value);
      if (text && text.length >= 2 && text.length <= 500) found.push({ path, text });
      return found;
    }
    if (typeof value === 'number') {
      found.push({ path, text: String(value) });
      return found;
    }
    if (typeof value === 'boolean') return found;
    if (Array.isArray(value)) {
      value.forEach((item, index) => effectRows(item, path + '[' + index + ']', depth + 1, found));
      return found;
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (/^(url|href|id|pageId|page_id|className|class_name|rarity|rare)$/i.test(key)) return;
        effectRows(value[key], path ? path + '.' + key : key, depth + 1, found);
      });
    }
    return found;
  }

  function effectTerms() {
    const terms = [];
    if (effectPreset.value) terms.push(effectPreset.value);
    effectInput.value.split(/[\n,、]+/).map(core.normalizeText).filter(Boolean).forEach(term => terms.push(term));
    return Array.from(new Set(terms));
  }

  function getTraitNames() {
    const names = [];
    state.servants.forEach(servant => (servant.traits || []).forEach(entry => {
      const name = traitName(entry);
      if (name) names.push(name);
    }));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function hasTrait(servant, name) {
    return (servant.traits || []).some(entry => traitName(entry) === name);
  }

  function scopeMatches(path, text) {
    const selected = scopeSelect.value;
    if (!selected) return true;
    const haystack = normalize(path + ' ' + text);
    if (selected === 'skill') return /skill|スキル/.test(haystack) && !/class.?skill|クラススキル/.test(haystack);
    if (selected === 'np') return /noble|phantasm|np|宝具/.test(haystack);
    if (selected === 'class') return /class.?skill|クラススキル/.test(haystack);
    return true;
  }

  function targetMatches(text) {
    const selected = targetSelect.value;
    if (!selected) return true;
    const haystack = core.normalizeText(text);
    const map = {
      self: ['自身'], ally1: ['味方単体', '味方1体'], allyall: ['味方全体'], enemy1: ['敵単体', '敵1体'], enemyall: ['敵全体']
    };
    return (map[selected] || []).some(word => haystack.includes(word));
  }

  function extractNumbers(text) {
    const result = [];
    const source = String(text || '').replace(/,/g, '');
    let match;
    const re = /(-?\d+(?:\.\d+)?)\s*%?/g;
    while ((match = re.exec(source))) result.push(Number(match[1]));
    return result.filter(Number.isFinite);
  }

  function magnitudeMatches(rows) {
    const raw = core.normalizeText(magnitudeInput.value);
    if (!raw) return true;
    const target = Number(raw);
    if (!Number.isFinite(target)) return true;
    const numbers = rows.flatMap(row => extractNumbers(row.text));
    if (!numbers.length) return false;
    if (compareSelect.value === 'gte') return numbers.some(value => value >= target);
    if (compareSelect.value === 'lte') return numbers.some(value => value <= target);
    return numbers.some(value => Math.abs(value - target) < 0.000001);
  }

  function relevantRows(servant) {
    const terms = effectTerms().map(normalize);
    let rows = effectRows(servant.effects).filter(row => scopeMatches(row.path, row.text) && targetMatches(row.text));
    if (terms.length) {
      rows = rows.filter(row => {
        const text = normalize(row.text);
        return state.effectMode === 'or' ? terms.some(term => text.includes(term)) : terms.every(term => text.includes(term));
      });
    }
    return rows;
  }

  function matches(servant) {
    const name = normalize(nameInput.value);
    if (name && !normalize(servant.name).includes(name)) return false;
    if (classSelect.value && servant.className !== classSelect.value) return false;
    if (raritySelect.value && Number(servant.rarity) !== Number(raritySelect.value)) return false;

    const traits = Array.from(state.selectedTraits);
    if (traits.length) {
      const ok = state.traitMode === 'or' ? traits.some(t => hasTrait(servant, t)) : traits.every(t => hasTrait(servant, t));
      if (!ok) return false;
    }

    const hasEffectFilter = effectTerms().length || scopeSelect.value || targetSelect.value || core.normalizeText(magnitudeInput.value);
    if (hasEffectFilter) {
      const rows = relevantRows(servant);
      if (!rows.length || !magnitudeMatches(rows)) return false;
    }
    return true;
  }

  const oldRoot = document.getElementById('ra-fgo-combined-search');
  if (oldRoot) oldRoot.style.display = 'none';

  const root = el('section', { id: 'ra-fgo-combined-advanced', style: 'margin:16px 0;padding:14px;border:2px solid #777;border-radius:8px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;' });
  root.append(el('h2', { style: 'margin:0 0 6px;font-size:20px;' }, 'サーヴァント総合絞り込み'), el('div', { style: 'margin-bottom:12px;font-size:12px;color:#555;' }, '統合検索UI ' + VERSION + '　特性・効果・対象・倍率・能力種別を同時指定できます。'));

  const dataStatus = el('div', { style: 'margin-bottom:10px;font-size:13px;font-weight:700;' }, '統合データ未読込');
  root.appendChild(dataStatus);

  const basic = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;' });
  const nameInput = el('input', { type: 'search', placeholder: 'サーヴァント名', style: 'min-width:180px;padding:5px 7px;' });
  const classSelect = el('select', { style: 'padding:5px 7px;' });
  classSelect.appendChild(el('option', { value: '' }, '全クラス'));
  Object.values(core.classMap).forEach(name => classSelect.appendChild(el('option', { value: name }, name)));
  const raritySelect = el('select', { style: 'padding:5px 7px;' });
  raritySelect.appendChild(el('option', { value: '' }, '全レアリティ'));
  [1,2,3,4,5].forEach(r => raritySelect.appendChild(el('option', { value: r }, '★' + r)));
  basic.append(nameInput, classSelect, raritySelect);
  root.appendChild(basic);

  root.appendChild(el('h3', { style: 'margin:10px 0 4px;font-size:16px;' }, '特性'));
  const traitModeRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:6px;font-size:13px;' });
  const traitAnd = el('input', { type:'radio', name:'ra-adv-trait-mode', checked:'checked' });
  const traitAndLabel = el('label'); traitAndLabel.append(traitAnd, document.createTextNode(' すべて持つ（AND）'));
  const traitOr = el('input', { type:'radio', name:'ra-adv-trait-mode' });
  const traitOrLabel = el('label'); traitOrLabel.append(traitOr, document.createTextNode(' いずれかを持つ（OR）'));
  traitModeRow.append(traitAndLabel, traitOrLabel); root.appendChild(traitModeRow);
  const traitSearch = el('input', { type:'search', placeholder:'特性名を絞り込み', style:'width:100%;max-width:360px;padding:5px 7px;margin-bottom:6px;' });
  const traitBox = el('div', { style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px 10px;max-height:300px;overflow:auto;padding:8px;border:1px solid #ddd;border-radius:6px;' });
  root.append(traitSearch, traitBox);

  root.appendChild(el('h3', { style:'margin:14px 0 4px;font-size:16px;' }, 'スキル・宝具効果'));
  const effectRow = el('div', { style:'display:flex;flex-wrap:wrap;gap:8px;align-items:center;' });
  const effectPreset = el('select', { style:'padding:5px 7px;min-width:190px;' });
  effectPreset.appendChild(el('option', { value:'' }, '効果候補を選択'));
  const effectInput = el('input', { type:'search', placeholder:'自由入力（例：NP、攻撃力アップ）', style:'min-width:240px;flex:1;padding:5px 7px;' });
  effectRow.append(effectPreset, effectInput); root.appendChild(effectRow);

  const effectModeRow = el('div', { style:'display:flex;flex-wrap:wrap;gap:14px;margin:6px 0;font-size:13px;' });
  const effectAnd = el('input', { type:'radio', name:'ra-adv-effect-mode', checked:'checked' });
  const effectAndLabel = el('label'); effectAndLabel.append(effectAnd, document.createTextNode(' 効果条件AND'));
  const effectOr = el('input', { type:'radio', name:'ra-adv-effect-mode' });
  const effectOrLabel = el('label'); effectOrLabel.append(effectOr, document.createTextNode(' 効果条件OR'));
  effectModeRow.append(effectAndLabel, effectOrLabel); root.appendChild(effectModeRow);

  const detailRow = el('div', { style:'display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;' });
  const scopeSelect = el('select', { style:'padding:5px 7px;' });
  [['','全能力'],['skill','保有スキル'],['np','宝具'],['class','クラススキル']].forEach(v => scopeSelect.appendChild(el('option',{value:v[0]},v[1])));
  const targetSelect = el('select', { style:'padding:5px 7px;' });
  [['','全対象'],['self','自身'],['ally1','味方単体'],['allyall','味方全体'],['enemy1','敵単体'],['enemyall','敵全体']].forEach(v => targetSelect.appendChild(el('option',{value:v[0]},v[1])));
  const compareSelect = el('select', { style:'padding:5px 7px;' });
  [['gte','倍率以上'],['lte','倍率以下'],['eq','倍率一致']].forEach(v => compareSelect.appendChild(el('option',{value:v[0]},v[1])));
  const magnitudeInput = el('input', { type:'number', step:'any', placeholder:'倍率・効果値', style:'width:120px;padding:5px 7px;' });
  detailRow.append(scopeSelect,targetSelect,compareSelect,magnitudeInput); root.appendChild(detailRow);

  const actions = el('div', { style:'display:flex;gap:8px;margin:12px 0;' });
  const searchButton = el('button',{type:'button'},'総合検索');
  const clearButton = el('button',{type:'button'},'条件を解除');
  actions.append(searchButton,clearButton); root.appendChild(actions);
  const summary = el('div',{style:'font-weight:700;margin:8px 0;'}); const results = el('div'); root.append(summary,results);

  const head = document.getElementById('ra-fgo-unified-filter-head');
  if (head && head.parentNode) head.parentNode.insertBefore(root, head.nextSibling);
  else (document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body).appendChild(root);

  function renderTraits() {
    const needle = normalize(traitSearch.value); traitBox.innerHTML='';
    getTraitNames().filter(name => !needle || normalize(name).includes(needle)).forEach(name => {
      const label = el('label',{style:'display:flex;gap:5px;align-items:flex-start;font-size:13px;'});
      const cb = el('input',{type:'checkbox',value:name}); cb.checked = state.selectedTraits.has(name);
      cb.addEventListener('change',()=>{ if(cb.checked) state.selectedTraits.add(name); else state.selectedTraits.delete(name); });
      label.append(cb,document.createTextNode(name)); traitBox.appendChild(label);
    });
  }

  function renderResults() {
    if (!state.servants.length) { summary.textContent='先に上部の「統合データ読込」を実行してください。'; results.innerHTML=''; return; }
    const matched = state.servants.filter(matches); summary.textContent='検索結果：'+matched.length+'騎'; results.innerHTML='';
    matched.forEach(servant => {
      const item=el('div',{style:'padding:9px 4px;border-top:1px solid #eee;'}); const line=el('div',{style:'font-weight:700;'});
      line.append(document.createTextNode('★'+servant.rarity+' '+servant.className+'　'),el('a',{href:servant.url,target:'_blank',rel:'noopener noreferrer'},servant.name)); item.appendChild(line);
      const traits=Array.from(state.selectedTraits); if(traits.length){ const hits=(servant.traits||[]).map(traitName).filter(n=>traits.includes(n)); item.appendChild(el('div',{style:'font-size:12px;color:#555;margin-top:3px;'},'特性一致：'+hits.join(' / '))); }
      const rows=relevantRows(servant).filter(row=>!/^[\d.-]+$/.test(row.text)).slice(0,8); if(rows.length) item.appendChild(el('div',{style:'font-size:12px;color:#555;margin-top:3px;'},'効果一致：'+rows.map(r=>r.text).join(' / ')));
      results.appendChild(item);
    });
  }

  function refreshData() { state.servants=unifiedApi.getServants()||[]; dataStatus.textContent=state.servants.length?'統合データ：'+state.servants.length+'騎 読込済み':'統合データ未読込'; renderTraits(); renderResults(); }

  function optionsUrl(){ try { if(current&&current.src) return new URL('data/effect_search_options.txt',current.src).href; } catch(_){} return ''; }
  const optionUrl=optionsUrl();
  if(optionUrl) fetch(optionUrl,{cache:'no-cache'}).then(r=>r.ok?r.text():'').then(text=>{ state.effectOptions=text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean); state.effectOptions.forEach(v=>effectPreset.appendChild(el('option',{value:v},v))); }).catch(()=>{});

  traitSearch.addEventListener('input',renderTraits); traitAnd.addEventListener('change',()=>{if(traitAnd.checked)state.traitMode='and';}); traitOr.addEventListener('change',()=>{if(traitOr.checked)state.traitMode='or';}); effectAnd.addEventListener('change',()=>{if(effectAnd.checked)state.effectMode='and';}); effectOr.addEventListener('change',()=>{if(effectOr.checked)state.effectMode='or';}); searchButton.addEventListener('click',renderResults); nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')renderResults();});
  clearButton.addEventListener('click',()=>{ state.selectedTraits.clear(); state.traitMode='and'; state.effectMode='and'; nameInput.value=''; classSelect.value=''; raritySelect.value=''; traitSearch.value=''; effectPreset.value=''; effectInput.value=''; scopeSelect.value=''; targetSelect.value=''; compareSelect.value='gte'; magnitudeInput.value=''; traitAnd.checked=true; traitOr.checked=false; effectAnd.checked=true; effectOr.checked=false; renderTraits(); renderResults(); });

  window.addEventListener('ra-fgo-unified-data-updated',refreshData);
  window.RaFGOCombinedAdvanced=Object.freeze({version:VERSION,refresh:refreshData,search:renderResults});
  refreshData();
})();
