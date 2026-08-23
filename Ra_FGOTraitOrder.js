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
  const fallback = 'https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@feature/trait-filter-foundation/data/trait_display_order.txt';
  let order = [];
  let sorting = false;

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

  function sortTraits() {
    if (sorting || !order.length) return;
    const root = document.getElementById('ra-fgo-trait-filter');
    if (!root) return;

    const inputs = Array.from(root.querySelectorAll('input[type="checkbox"][value]'));
    if (inputs.length < 2) return;

    const box = inputs[0].parentNode && inputs[0].parentNode.parentNode;
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

    let changed = false;
    for (let i = 0; i < labels.length; i += 1) {
      if (labels[i] !== sorted[i]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    sorting = true;
    sorted.forEach(label => box.appendChild(label));
    sorting = false;
  }

  function attach() {
    const root = document.getElementById('ra-fgo-trait-filter');
    if (!root) {
      setTimeout(attach, 100);
      return;
    }

    const observer = new MutationObserver(() => sortTraits());
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('input', () => setTimeout(sortTraits, 0));
    root.addEventListener('click', () => setTimeout(sortTraits, 0));
    sortTraits();
  }

  fetch(dataUrl(), { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(text => {
      order = text.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      attach();
    })
    .catch(error => console.warn('[Ra_FGOTraitOrder] 表示順データを読み込めませんでした。', error));
})();
