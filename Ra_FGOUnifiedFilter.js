/*
 * Ra_FGOUnifiedFilter.js
 * @wiki / siroi_human 用 サーヴァント総合検索 bootstrap
 * Author: argyi
 *
 * 既存の効果検索と共通基盤版の特性検索を同一ページで起動します。
 */
(() => {
  'use strict';

  if (window.__RA_FGO_UNIFIED_FILTER_BOOTSTRAP__) return;
  window.__RA_FGO_UNIFIED_FILTER_BOOTSTRAP__ = true;

  const current = document.currentScript;
  const FALLBACK_BASE = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/';
  const MODULES = [
    'Ra_FGOSharedFetch.js',
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

  function getLoadButtons() {
    return Array.from(document.querySelectorAll('button')).filter(button => {
      return String(button.textContent || '').trim() === 'データ読込';
    });
  }

  function waitForButton(button) {
    return new Promise(resolve => {
      const startedAt = Date.now();
      let sawDisabled = button.disabled;
      const timer = setInterval(() => {
        if (button.disabled) sawDisabled = true;
        if ((sawDisabled && !button.disabled) || (!sawDisabled && Date.now() - startedAt > 700)) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }

  async function runUnifiedLoad(button, status) {
    const buttons = getLoadButtons();
    if (buttons.length < 2) {
      throw new Error('効果検索または特性検索のデータ読込ボタンを検出できませんでした。');
    }

    button.disabled = true;
    try {
      status.textContent = '効果・特性データを読込中…';
      for (const target of buttons) {
        target.click();
        await waitForButton(target);
      }
      const stats = window.RaFGOSharedFetch && window.RaFGOSharedFetch.stats ? window.RaFGOSharedFetch.stats() : null;
      status.textContent = stats
        ? '統合読込完了：共有ページ ' + stats.cachedPages + ' / 再利用 ' + stats.cacheHits
        : '統合読込完了';
    } finally {
      button.disabled = false;
    }
  }

  function addUnifiedControls(head) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '統合データ読込';
    const status = document.createElement('span');
    status.style.cssText = 'font-size:12px;color:#555;';
    status.textContent = '未読込';
    button.addEventListener('click', () => {
      runUnifiedLoad(button, status).catch(error => {
        console.error('[Ra_FGOUnifiedFilter] 統合データ読込に失敗しました。', error);
        status.textContent = '読込失敗：' + (error && error.message ? error.message : error);
      });
    });
    row.appendChild(button);
    row.appendChild(status);
    head.appendChild(row);
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
      note.textContent = '上の「統合データ読込」1回で、効果検索と特性検索のデータをまとめて読み込めます。';
      head.appendChild(title);
      head.appendChild(note);
      mountParent().appendChild(head);

      for (const path of MODULES) {
        await loadScript(path);
      }
      addUnifiedControls(head);
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
