/*
 * Ra_FGOEffectFilter.js
 * @wiki / siroi_human 用 FGOスキル・宝具・特性検索 bootstrap
 * Version: 1.2.0
 * Author: argyi
 *
 * v1.1.0 本体を読み込み、v1.2.0差分
 * （NP最大増加の同義語対応 + サーヴァント特性検索）を起動時に適用します。
 */
(() => {
  'use strict';

  if (window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__ = true;

  const current = document.currentScript;
  const FALLBACK_BASE = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/';
  const PART_PATHS = Array.from(
    { length: 20 },
    (_, index) => `tools/v1.1.0/chunks/p${String(index).padStart(2, '0')}.b64`
  );
  const EXPECTED_BASE64_LENGTH = 19836;
  const PATCHES = [["np", "['np_charge','NP増加',/NP(?:を)?増やす|NP(?:を)?増加|NPチャージ/i]", "['np_charge','NP増加',/NP(?:を)?(?:最大まで)?増やす|NP(?:を)?増加|NPチャージ/i]"], ["version-comment", " * Version: 1.1.0", " * Version: 1.2.0"], ["version-const", "const VERSION = '1.1.0';", "const VERSION = '1.2.0';"], ["summary-traits", " * - 効果 / 対象 / クラス / レアリティ / 検索範囲 / AND・OR で絞り込み", " * - 効果 / 対象 / クラス / レアリティ / 特性 / 検索範囲 / AND・OR で絞り込み"], ["trait-parser", "  function parseMetadata(doc, url) {\n    let name = '';\n", "  function parseTraitText(value) {\n    return String(value ?? '')\n      .replace(/\\u00a0/g, ' ')\n      .split(/\\s*(?:\\/|／|、|\\n)\\s*/)\n      .map(normalizeText)\n      .filter(t => t && t !== '-');\n  }\n\n  function parseMetadata(doc, url) {\n    let name = '';\n"], ["trait-var", "    let rarity = '';\n    let className = '';\n    const rows = [...doc.querySelectorAll('tr')];\n", "    let rarity = '';\n    let className = '';\n    let traits = [];\n    const rows = [...doc.querySelectorAll('tr')];\n"], ["trait-extract", "        if (texts[i] === '真名' && texts[i + 1] && !name) name = texts[i + 1];\n      }\n    }\n", "        if (texts[i] === '真名' && texts[i + 1] && !name) name = texts[i + 1];\n        if (texts[i] === '特性' && cells[i + 1]) {\n          const parsedTraits = parseTraitText(cells[i + 1].innerText || cells[i + 1].textContent || texts[i + 1] || '');\n          if (parsedTraits.length) traits = parsedTraits;\n        }\n      }\n    }\n"], ["trait-return", "    return { name: name || url, rarity, className, no: noMatch ? noMatch[1] : '' };", "    return { name: name || url, rarity, className, no: noMatch ? noMatch[1] : '', traits:[...new Set(traits)] };"], ["trait-render-after-load", "      state.records = results.filter(r => r && !r.__error);\n      state.failures = results.filter(r => r?.__error);\n      state.loadedAt = Date.now();\n      saveCache();\n", "      state.records = results.filter(r => r && !r.__error);\n      state.failures = results.filter(r => r?.__error);\n      state.loadedAt = Date.now();\n      renderTraitOptions();\n      saveCache();\n"], ["search-traits", "    const selectedClasses = getChecked('ra-class');\n    const selectedRarities = getChecked('ra-rarity');\n    const scopes = getChecked('ra-scope');\n    const mode = state.elements.root.querySelector('input[name=\"ra-mode\"]:checked')?.value || 'and';\n    const keyword = normalizeText(state.elements.keyword.value).toLowerCase();\n\n    return state.records.map(record => {\n      if (selectedClasses.length && !selectedClasses.includes(record.className)) return null;\n      if (selectedRarities.length && !selectedRarities.includes(record.rarity)) return null;\n      if (keyword && !normalizeText(record.name).toLowerCase().includes(keyword)) return null;\n", "    const selectedClasses = getChecked('ra-class');\n    const selectedRarities = getChecked('ra-rarity');\n    const selectedTraits = getChecked('ra-trait');\n    const scopes = getChecked('ra-scope');\n    const mode = state.elements.root.querySelector('input[name=\"ra-mode\"]:checked')?.value || 'and';\n    const traitMode = state.elements.root.querySelector('input[name=\"ra-trait-mode\"]:checked')?.value || 'and';\n    const keyword = normalizeText(state.elements.keyword.value).toLowerCase();\n\n    return state.records.map(record => {\n      if (selectedClasses.length && !selectedClasses.includes(record.className)) return null;\n      if (selectedRarities.length && !selectedRarities.includes(record.rarity)) return null;\n      if (selectedTraits.length) {\n        const traits = Array.isArray(record.traits) ? record.traits : [];\n        const traitBooleans = selectedTraits.map(trait => traits.includes(trait));\n        const traitPassed = traitMode === 'and' ? traitBooleans.every(Boolean) : traitBooleans.some(Boolean);\n        if (!traitPassed) return null;\n      }\n      if (keyword && !normalizeText(record.name).toLowerCase().includes(keyword)) return null;\n"], ["render-selected-traits", "    const selectedEffects = getChecked('ra-effect');\n    const selectedTargets = getChecked('ra-target');\n    state.elements.resultCount.textContent = `${matches.length}騎`;\n", "    const selectedEffects = getChecked('ra-effect');\n    const selectedTargets = getChecked('ra-target');\n    const selectedTraits = getChecked('ra-trait');\n    state.elements.resultCount.textContent = `${matches.length}騎`;\n"], ["render-trait-block", "      const clsShort = CLASS_LABELS[record.className] || record.className || '不明';\n      const blocks = matchedAbilities.map(a => renderAbility(a, selectedEffects, selectedTargets)).join('');\n      return `<article class=\"ra-result-card\">\n        <div class=\"ra-result-title\"><span class=\"ra-class-badge\">${escapeHtml(clsShort)}</span><span class=\"ra-stars\">${escapeHtml(stars)}</span><a href=\"${escapeHtml(record.url)}\">${escapeHtml(record.name)}</a>${record.no ? `<span class=\"ra-no\">No.${escapeHtml(record.no)}</span>` : ''}</div>\n        ${blocks || '<div class=\"ra-hit\">該当効果あり</div>'}\n      </article>`;\n", "      const clsShort = CLASS_LABELS[record.className] || record.className || '不明';\n      const blocks = matchedAbilities.map(a => renderAbility(a, selectedEffects, selectedTargets)).join('');\n      const traitList = Array.isArray(record.traits) ? record.traits : [];\n      const traitsHtml = traitList.length\n        ? `<div class=\"ra-result-traits\"><strong>特性</strong><div class=\"ra-result-trait-list\">${traitList.map(trait => `<span class=\"ra-result-trait${selectedTraits.includes(trait) ? ' is-match' : ''}\">${escapeHtml(trait)}</span>`).join('')}</div></div>`\n        : '<div class=\"ra-result-traits\"><strong>特性</strong><span class=\"ra-note\">特性データなし</span></div>';\n      return `<article class=\"ra-result-card\">\n        <div class=\"ra-result-title\"><span class=\"ra-class-badge\">${escapeHtml(clsShort)}</span><span class=\"ra-stars\">${escapeHtml(stars)}</span><a href=\"${escapeHtml(record.url)}\">${escapeHtml(record.name)}</a>${record.no ? `<span class=\"ra-no\">No.${escapeHtml(record.no)}</span>` : ''}</div>\n        ${traitsHtml}\n        ${blocks || '<div class=\"ra-hit\">該当効果あり</div>'}\n      </article>`;\n"], ["trait-functions", "  function clearFilters() {\n", "  function traitOptions() {\n    const traits = new Set();\n    for (const record of state.records) {\n      for (const trait of Array.isArray(record.traits) ? record.traits : []) {\n        const normalized = normalizeText(trait);\n        if (normalized) traits.add(normalized);\n      }\n    }\n    return [...traits].sort((a,b) => a.localeCompare(b, 'ja'));\n  }\n\n  function filterTraitOptions() {\n    const box = state.elements.traitOptions;\n    if (!box) return;\n    const keyword = normalizeText(state.elements.traitFilter?.value || '').toLowerCase();\n    for (const label of box.querySelectorAll('.ra-trait-chip')) {\n      const text = normalizeText(label.textContent).toLowerCase();\n      label.hidden = Boolean(keyword && !text.includes(keyword));\n    }\n  }\n\n  function renderTraitOptions() {\n    const box = state.elements.traitOptions;\n    if (!box) return;\n    const selected = new Set(getChecked('ra-trait'));\n    const traits = traitOptions();\n    if (state.elements.traitCount) state.elements.traitCount.textContent = `${traits.length}項目`;\n    if (!traits.length) {\n      box.innerHTML = '<div class=\"ra-note\">データ読込後に特性候補が表示されます。</div>';\n      return;\n    }\n    box.innerHTML = traits.map(trait => `<label class=\"ra-chip ra-trait-chip\"><input type=\"checkbox\" name=\"ra-trait\" value=\"${escapeHtml(trait)}\"${selected.has(trait) ? ' checked' : ''}><span>${escapeHtml(trait)}</span></label>`).join('');\n    filterTraitOptions();\n  }\n\n  function clearFilters() {\n"], ["clear-traits", "    state.elements.root.querySelectorAll('input[name=\"ra-effect\"],input[name=\"ra-target\"],input[name=\"ra-class\"],input[name=\"ra-rarity\"]').forEach(el => { el.checked = false; });\n    state.elements.root.querySelectorAll('input[name=\"ra-scope\"]').forEach(el => { el.checked = el.value !== 'classSkill'; });\n    state.elements.root.querySelector('input[name=\"ra-mode\"][value=\"and\"]').checked = true;\n    state.elements.keyword.value = '';\n", "    state.elements.root.querySelectorAll('input[name=\"ra-effect\"],input[name=\"ra-target\"],input[name=\"ra-class\"],input[name=\"ra-rarity\"],input[name=\"ra-trait\"]').forEach(el => { el.checked = false; });\n    state.elements.root.querySelectorAll('input[name=\"ra-scope\"]').forEach(el => { el.checked = el.value !== 'classSkill'; });\n    state.elements.root.querySelector('input[name=\"ra-mode\"][value=\"and\"]').checked = true;\n    state.elements.root.querySelector('input[name=\"ra-trait-mode\"][value=\"and\"]').checked = true;\n    state.elements.keyword.value = '';\n    if (state.elements.traitFilter) state.elements.traitFilter.value = '';\n    filterTraitOptions();\n"], ["trait-css", "        #ra-fgo-effect-filter .ra-result-title a{font-size:16px;text-decoration:none}\n        #ra-fgo-effect-filter .ra-class-badge{display:inline-flex;align-items:center;justify-content:center;min-width:28px;padding:2px 6px;border-radius:4px;background:#333;color:#fff;font-size:12px}\n", "        #ra-fgo-effect-filter .ra-result-title a{font-size:16px;text-decoration:none}\n        #ra-fgo-effect-filter .ra-result-traits{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;padding:7px 11px;background:#fbfcfd;border-bottom:1px solid #edf0f3;font-size:12px}\n        #ra-fgo-effect-filter .ra-result-trait-list{display:flex;gap:4px;flex-wrap:wrap;flex:1}\n        #ra-fgo-effect-filter .ra-result-trait{display:inline-block;padding:1px 6px;border:1px solid #d7dce2;border-radius:999px;background:#fff;color:#4b5968}\n        #ra-fgo-effect-filter .ra-result-trait.is-match{background:#ffe27a;border-color:#e0bd38;color:#4a3a00;font-weight:700}\n        #ra-fgo-effect-filter .ra-trait-selector{width:100%;border-top:1px solid #eceff2;margin-top:4px;padding-top:4px}\n        #ra-fgo-effect-filter .ra-trait-selector summary{cursor:pointer;padding:8px 2px;font-weight:700}\n        #ra-fgo-effect-filter .ra-trait-selector summary small{font-weight:400;color:#777}\n        #ra-fgo-effect-filter .ra-trait-options{max-height:260px;overflow:auto;padding-right:4px}\n        #ra-fgo-effect-filter .ra-class-badge{display:inline-flex;align-items:center;justify-content:center;min-width:28px;padding:2px 6px;border-radius:4px;background:#333;color:#fff;font-size:12px}\n"], ["trait-ui", "          <div class=\"ra-row\"><span class=\"ra-label\">レアリティ</span>\n            ${[1,2,3,4,5].map(r => `<label class=\"ra-chip\"><input type=\"checkbox\" name=\"ra-rarity\" value=\"${r}\"><span>${'★'.repeat(r)}</span></label>`).join('')}\n          </div>\n          <div class=\"ra-row\"><span class=\"ra-label\">検索範囲</span>\n", "          <div class=\"ra-row\"><span class=\"ra-label\">レアリティ</span>\n            ${[1,2,3,4,5].map(r => `<label class=\"ra-chip\"><input type=\"checkbox\" name=\"ra-rarity\" value=\"${r}\"><span>${'★'.repeat(r)}</span></label>`).join('')}\n          </div>\n          <details class=\"ra-trait-selector\">\n            <summary>サーヴァント特性 <small id=\"ra-trait-count\">0項目</small></summary>\n            <div class=\"ra-row\"><span class=\"ra-label\">候補検索</span><input type=\"text\" id=\"ra-trait-filter\" placeholder=\"例：神性、人類の脅威\"></div>\n            <div class=\"ra-note\">個別ページの「特性」欄から候補を自動生成します。複数選択できます。</div>\n            <div id=\"ra-trait-options\" class=\"ra-chip-grid ra-trait-options\"><div class=\"ra-note\">データ読込後に特性候補が表示されます。</div></div>\n            <div class=\"ra-row\"><span class=\"ra-label\">特性条件</span>\n              <label><input type=\"radio\" name=\"ra-trait-mode\" value=\"and\" checked> 選んだ特性をすべて持つ（AND）</label>\n              <label><input type=\"radio\" name=\"ra-trait-mode\" value=\"or\"> いずれかを持つ（OR）</label>\n            </div>\n          </details>\n          <div class=\"ra-row\"><span class=\"ra-label\">検索範囲</span>\n"], ["trait-elements", "      results: root.querySelector('#ra-results'),\n      rateConditions: root.querySelector('#ra-rate-conditions')\n", "      results: root.querySelector('#ra-results'),\n      rateConditions: root.querySelector('#ra-rate-conditions'),\n      traitOptions: root.querySelector('#ra-trait-options'),\n      traitFilter: root.querySelector('#ra-trait-filter'),\n      traitCount: root.querySelector('#ra-trait-count')\n"], ["trait-filter-listener", "    updateRateConditionUI();\n    state.elements.keyword.addEventListener('keydown', e => {\n", "    updateRateConditionUI();\n    state.elements.traitFilter?.addEventListener('input', filterTraitOptions);\n    state.elements.keyword.addEventListener('keydown', e => {\n"], ["cache-traits", "    if (loadCache()) {\n      const time = new Date(state.loadedAt).toLocaleString('ja-JP');\n", "    if (loadCache()) {\n      renderTraitOptions();\n      const time = new Date(state.loadedAt).toLocaleString('ja-JP');\n"], ["ui-title", "<div class=\"ra-panel-head\">FGO スキル・宝具効果検索</div>", "<div class=\"ra-panel-head\">FGO スキル・宝具・特性検索</div>"]];

  function assetUrl(path) {
    try {
      const src = current?.src || '';
      if (src) return new URL(path, src).href;
    } catch (_) {}
    return new URL(path, FALLBACK_BASE).href;
  }

  function showError(error) {
    console.error('[Ra_FGOEffectFilter] 起動に失敗しました。', error);
    const box = document.createElement('div');
    box.style.cssText = 'margin:12px 0;padding:10px 12px;border:1px solid #c66;background:#fff4f4;color:#822;border-radius:6px;font-family:sans-serif;';
    box.textContent = `FGO効果検索ツールの読み込みに失敗しました: ${error?.message || error}`;
    if (current?.parentNode) current.parentNode.insertBefore(box, current.nextSibling);
    else (document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body).appendChild(box);
  }

  function applyV120Patch(code) {
    let patched = code;
    for (const [label, before, after] of PATCHES) {
      if (!patched.includes(before)) {
        throw new Error(`v1.2.0差分の適用に失敗しました: ${label}`);
      }
      patched = patched.replace(before, after);
    }
    if (!/Version:\s*1\.2\.0/.test(patched) || !/const VERSION = '1\.2\.0';/.test(patched)) {
      throw new Error('v1.2.0本体バージョンの検証に失敗しました。');
    }
    if (!/function parseTraitText/.test(patched) || !/name="ra-trait"/.test(patched)) {
      throw new Error('特性検索機能の検証に失敗しました。');
    }
    return patched;
  }

  async function boot() {
    try {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('このブラウザはDecompressionStreamに対応していません。最新版のEdge / Chrome等で開いてください。');
      }

      const responses = await Promise.all(
        PART_PATHS.map(path => fetch(assetUrl(path), { cache: 'no-cache' }))
      );

      responses.forEach((response, index) => {
        if (!response.ok) {
          throw new Error(`本体データ取得エラー: ${PART_PATHS[index]} / HTTP ${response.status}`);
        }
      });

      const parts = await Promise.all(responses.map(response => response.text()));
      const base64Text = parts.join('').replace(/\s+/g, '');
      if (base64Text.length !== EXPECTED_BASE64_LENGTH) {
        throw new Error(`本体データ長が不正です: ${base64Text.length} / ${EXPECTED_BASE64_LENGTH}`);
      }

      const compressed = Uint8Array.from(atob(base64Text), c => c.charCodeAt(0));
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const baseCode = await new Response(stream).text();

      if (!/Version:\s*1\.1\.0/.test(baseCode)) {
        throw new Error('基底本体バージョンの検証に失敗しました。');
      }

      const code = applyV120Patch(baseCode);
      const script = document.createElement('script');
      script.textContent = `${code}\n//# sourceURL=Ra_FGOEffectFilter.source.js`;
      (current?.parentNode || document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
