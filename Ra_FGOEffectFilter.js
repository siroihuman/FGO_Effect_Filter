/*
 * Ra_FGOEffectFilter.js
 * @wiki / siroi_human 用 FGOスキル・宝具効果検索 bootstrap
 * Version: 1.0.0
 * Author: argyi
 *
 * 本体は tools/Ra_FGOEffectFilter.js.gz.b64 にgzip+Base64で保持し、
 * 読込時にブラウザ上で展開して実行します。
 */
(() => {
  'use strict';

  if (window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__ = true;

  const current = document.currentScript;
  const FALLBACK_PAYLOAD = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/tools/Ra_FGOEffectFilter.js.gz.b64';

  function payloadUrl() {
    try {
      const src = current?.src || '';
      if (src) return new URL('tools/Ra_FGOEffectFilter.js.gz.b64', src).href;
    } catch (_) {}
    return FALLBACK_PAYLOAD;
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
      if (typeof DecompressionStream !== 'function') {
        throw new Error('このブラウザはDecompressionStreamに対応していません。最新版のEdge / Chrome等で開いてください。');
      }

      const response = await fetch(payloadUrl(), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`本体データ取得エラー: HTTP ${response.status}`);

      const base64 = (await response.text()).replace(/\s+/g, '');
      const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();

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
