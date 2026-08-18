/*
 * Ra_FGOEffectFilter.js
 * @wiki / siroi_human 用 FGOスキル・宝具効果検索 bootstrap
 * Version: 1.1.0
 * Author: argyi
 *
 * v1.1.0 本体は tools/v1.1.0/chunks/ 以下のBase64分割ファイルに
 * gzip圧縮して保持し、読込時にブラウザ上で結合・展開して実行します。
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
      const base64 = parts.join('').replace(/\s+/g, '');
      if (base64.length !== EXPECTED_BASE64_LENGTH) {
        throw new Error(`本体データ長が不正です: ${base64.length} / ${EXPECTED_BASE64_LENGTH}`);
      }

      const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();

      if (!/Version:\s*1\.1\.0/.test(code)) {
        throw new Error('本体バージョンの検証に失敗しました。');
      }

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
