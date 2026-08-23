/*
 * Ra_FGOUnifiedFilter.js
 * @wiki / siroi_human 用 サーヴァント総合検索 bootstrap
 * Author: argyi
 *
 * 既存の効果検索と共通基盤版の特性検索を同一ページで起動します。
 * 現段階ではUIを安全に同居させる統合第1段階です。
 */
(() => {
  'use strict';

  if (window.__RA_FGO_UNIFIED_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_UNIFIED_FILTER_BOOTSTRAP__ = true;

  const current = document.currentScript;
  const FALLBACK_BASE = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/';
  const MODULES = [
    'Ra_FGODataCore.js',
    'Ra_FGOEffectFilter.js',
    'Ra_FGOTraitFilterCore.js',
    'Ra_FGOTraitOrder.js'
  ];

  function assetUrl(path) {
    try {
      const src = current && current.src ? current.src : '';
      if (src) return new URL(path, src).href;
    } catch (_) {}
    return new URL(path, FALLBACK_BASE).href;
  }

  function mountParent() {
    if (current && current.parentNode) return current.parentNode;
    return document.querySelector('#content,main,.atwiki-page-body,.wiki-body,.atwiki-body') || document.body;
  }

  function showError(error) {
    console.error('[Ra_FGOUnifiedFilter] 起動に失敗しました。', error);
    const box = document.createElement('div');
    box.style.cssText = 'margin:12px 0;padding:10px 12px;border:1px solid #c66;background:#fff4f4;color:#822;border-radius:6px;font-family:sans-serif;';
    box.textContent = 'サーヴァント総合検索の読み込みに失敗しました: ' + (error && error.message ? error.message : error);
    mountParent().appendChild(box);
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = assetUrl(path);
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(path + ' の読み込みに失敗しました。'));
      mountParent().appendChild(script);
    });
  }

  async function boot() {
    try {
      const head = document.createElement('div');
      head.id = 'ra-fgo-unified-filter-head';
      head.style.cssText = 'margin:16px 0 8px;padding:10px 12px;border:1px solid #aaa;border-radius:8px;background:#f8f8f8;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
      const title = document.createElement('strong');
      title.textContent = 'サーヴァント総合検索（統合開発版）';
      const note = document.createElement('div');
      note.style.cssText = 'margin-top:4px;font-size:12px;color:#555;';
      note.textContent = 'スキル効果検索と特性検索を同一ページで利用できます。';
      head.appendChild(title);
      head.appendChild(note);
      mountParent().appendChild(head);

      for (const path of MODULES) {
        await loadScript(path);
      }
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
