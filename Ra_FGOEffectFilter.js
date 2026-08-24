/*
 * Ra_FGOEffectFilter.js
 * @wiki / siroi_human 用 FGOスキル・宝具・特性検索 bootstrap
 * Version: 1.3.6
 * Author: argyi
 */
(() => {
  'use strict';
  if (window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_EFFECT_FILTER_BOOTSTRAP__ = true;

  const current = document.currentScript;
  const FALLBACK_BASE = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/';
  const PART_PATHS = [
    'tools/v1.3.6/parts/p00a.txt',
    'tools/v1.3.5/parts/p00b.txt',
    'tools/v1.3.5/parts/p00c.txt',
    'tools/v1.3.5/parts/p01.txt',
    'tools/v1.3.5/parts/p02.txt',
    'tools/v1.3.5/parts/p03.txt',
    'tools/v1.3.5/parts/p04.txt',
    'tools/v1.3.5/parts/p05.txt',
    'tools/v1.3.5/parts/p06.txt',
    'tools/v1.3.6/parts/p07a.txt',
    'tools/v1.3.6/parts/np_fix.txt',
    'tools/v1.3.6/parts/p07b.txt'
  ];
  const EXPECTED_SOURCE_LENGTH = 73082;
  const EXPECTED_UTF8_LENGTH = 81370;

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
      const responses = await Promise.all(PART_PATHS.map(path => fetch(assetUrl(path), { cache: 'no-cache' })));
      responses.forEach((response,index) => {
        if (!response.ok) throw new Error(`本体データ取得エラー: ${PART_PATHS[index]} / HTTP ${response.status}`);
      });
      const parts = await Promise.all(responses.map(response => response.text()));
      const code = parts.join('');
      const byteLength = new TextEncoder().encode(code).length;
      if (code.length !== EXPECTED_SOURCE_LENGTH || byteLength !== EXPECTED_UTF8_LENGTH) {
        throw new Error(`本体データ長が不正です: ${code.length}/${byteLength} / ${EXPECTED_SOURCE_LENGTH}/${EXPECTED_UTF8_LENGTH}`);
      }
      if (!/Version:\s*1\.3\.6/.test(code) || !/const VERSION = '1\.3\.6';/.test(code)) {
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
