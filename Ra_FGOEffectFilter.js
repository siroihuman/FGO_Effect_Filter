/*
 * Ra_FGOEffectFilter.js
 * @wiki / siroi_human 用 FGOスキル・宝具・特性検索 bootstrap
 * Version: 1.3.3
 * Author: argyi
 */
(() => {
  'use strict';
  if (window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__ = true;
  const current = document.currentScript;
  const FALLBACK_BASE = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/';
  const PART_PATHS = [
    'tools/v1.3.3/chunks/c00.b64',
    'tools/v1.3.3/chunks/c01.b64',
    'tools/v1.3.3/chunks/p08.b64',
    'tools/v1.3.3/chunks/p09.b64',
    'tools/v1.3.3/chunks/p10.b64',
    'tools/v1.3.3/chunks/p11.b64',
    'tools/v1.3.3/chunks/p12.b64',
    'tools/v1.3.3/chunks/p13.b64',
    'tools/v1.3.3/chunks/p14.b64',
    'tools/v1.3.3/chunks/p15.b64',
    'tools/v1.3.3/chunks/p16.b64',
    'tools/v1.3.3/chunks/p17.b64',
    'tools/v1.3.3/chunks/p18.b64',
    'tools/v1.3.3/chunks/p19.b64',
    'tools/v1.3.3/chunks/p20.b64',
    'tools/v1.3.3/chunks/p21.b64',
    'tools/v1.3.3/chunks/p22.b64',
    'tools/v1.3.3/chunks/p23.b64',
    'tools/v1.3.3/chunks/p24.b64',
    'tools/v1.3.3/chunks/p25.b64'
  ];
  const EXPECTED_BASE64_LENGTH = 25528;
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
  async function boot() {
    try {
      if (typeof DecompressionStream !== 'function') throw new Error('このブラウザはDecompressionStreamに対応していません。最新版のEdge / Chrome等で開いてください。');
      const responses = await Promise.all(PART_PATHS.map(path => fetch(assetUrl(path), { cache: 'no-cache' })));
      responses.forEach((response,index) => { if (!response.ok) throw new Error(`本体データ取得エラー: ${PART_PATHS[index]} / HTTP ${response.status}`); });
      const parts = await Promise.all(responses.map(response => response.text()));
      const base64 = parts.join('').replace(/\s+/g, '');
      if (base64.length !== EXPECTED_BASE64_LENGTH) throw new Error(`本体データ長が不正です: ${base64.length} / ${EXPECTED_BASE64_LENGTH}`);
      const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();
      if (!/Version:\s*1\.3\.3/.test(code) || !/const VERSION = '1\.3\.3';/.test(code)) throw new Error('本体バージョンの検証に失敗しました。');
      const script = document.createElement('script');
      script.textContent = `${code}\n//# sourceURL=Ra_FGOEffectFilter.source.js`;
      (current?.parentNode || document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (error) { showError(error); }
  }
  boot();
})();
