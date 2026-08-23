/*
 * Ra_FGOTraitOrder.js
 * @wiki / siroi_human 用 特性表示順補助
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.__RA_FGO_TRAIT_ORDER__) return;
  window.__RA_FGO_TRAIT_ORDER__ = true;

  const current = document.currentScript;
  const fallback = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/data/trait_display_order.txt';
  let order = [];
  let watchTimer = 0;

  function dataUrl() {
    try {
      if (current && current.src) return new URL('data/trait_display_order.txt', current.src).href;
    } catch (_) {}
    return fallback;
  }

  function rank(name) {
    const index = order.indexOf(name);
    return index < 0 ? 999999 : index;
  }

  function compareNames(a, b) {
    const ar = rank(a);
    const br = rank(b);
    if (ar !== br) return ar - br;
    return a.localeCompare(b, 'ja');
  }

  function sortRoot(rootId) {
    if (!order.length) return;
    const root = document.getElementById(rootId);
    if (!root) return;

    const inputs = Array.from(root.querySelectorAll('input[type="checkbox"][value]'));
    if (inputs.length < 2) return;

    const firstLabel = inputs[0].parentNode;
    const box = firstLabel && firstLabel.parentNode;
    if (!box) return;

    const labels = Array.from(box.children).filter(node => {
      return node.querySelector && node.querySelector('input[type="checkbox"][value]');
    });
    if (labels.length < 2) return;

    const sorted = labels.slice().sort((a, b) => {
      const ai = a.querySelector('input[type="checkbox"][value]');
      const bi = b.querySelector('input[type="checkbox"][value]');
      return compareNames(ai ? ai.value : '', bi ? bi.value : '');
    });

    sorted.forEach(label => box.appendChild(label));
  }

  function sortTraits() {
    sortRoot('ra-fgo-trait-filter');
    sortRoot('ra-fgo-combined-search');
  }

  function stopWatch() {
    if (!watchTimer) return;
    clearInterval(watchTimer);
    watchTimer = 0;
  }

  function startWatch() {
    stopWatch();
    watchTimer = setInterval(sortTraits, 250);
    setTimeout(stopWatch, 5000);
  }

  function attachRoot(root) {
    if (!root || root.dataset.raTraitOrderAttached === '1') return;
    root.dataset.raTraitOrderAttached = '1';
    root.addEventListener('input', () => setTimeout(sortTraits, 0));
    root.addEventListener('click', () => setTimeout(sortTraits, 0));
  }

  function attach() {
    attachRoot(document.getElementById('ra-fgo-trait-filter'));
    attachRoot(document.getElementById('ra-fgo-combined-search'));
    sortTraits();
  }

  fetch(dataUrl(), { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(text => {
      order = text.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      window.RaFGOTraitOrder = Object.freeze({
        compareNames,
        sort: sortTraits,
        getOrder: () => order.slice()
      });
      attach();
      startWatch();
    })
    .catch(error => console.warn('[Ra_FGOTraitOrder] 表示順データを読み込めませんでした。', error));
})();
