/*
 * Ra_FGOUnifiedData.js
 * @wiki / siroi_human 用 効果・特性統合データブリッジ
 * Author: argyi
 */
(() => {
  'use strict';

  if (window.RaFGOUnifiedData) return;

  const core = window.RaFGODataCore;
  if (!core) return;

  const VERSION = '0.1.1-dev';
  const EFFECT_HINTS = ['effect', 'skill', 'fgo'];
  const TRAIT_HINT = 'trait';

  function isObject(value) {
    return !!value && typeof value === 'object';
  }

  function getArrays(value, depth = 0, found = []) {
    if (depth > 3 || !isObject(value)) return found;
    if (Array.isArray(value)) {
      if (value.length && value.some(item => isObject(item))) found.push(value);
      value.slice(0, 4).forEach(item => getArrays(item, depth + 1, found));
      return found;
    }
    Object.keys(value).slice(0, 20).forEach(key => getArrays(value[key], depth + 1, found));
    return found;
  }

  function servantScore(item) {
    if (!isObject(item)) return 0;
    let score = 0;
    if (item.id || item.pageId || item.page_id) score += 3;
    if (item.name || item.servantName || item.servant_name || item.title) score += 3;
    if (item.url || item.href || item.pageUrl || item.page_url) score += 2;
    if (item.className || item.class || item.class_name) score += 1;
    if (item.rarity || item.rare) score += 1;
    if (item.skills || item.skill || item.np || item.noblePhantasm || item.effects || item.abilities) score += 3;
    return score;
  }

  function bestServantArray(value) {
    const arrays = getArrays(value);
    let best = [];
    let bestScore = 0;
    arrays.forEach(array => {
      if (!array.length) return;
      const sample = array.slice(0, 8);
      const score = sample.reduce((sum, item) => sum + servantScore(item), 0) / sample.length;
      if (score > bestScore && score >= 3) {
        best = array;
        bestScore = score;
      }
    });
    return best;
  }

  function parseStorageValue(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function findEffectRecords() {
    const candidates = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        const lower = key.toLowerCase();
        if (lower.includes(TRAIT_HINT) || lower.includes('unified')) continue;
        if (!EFFECT_HINTS.some(hint => lower.includes(hint))) continue;
        const parsed = parseStorageValue(localStorage.getItem(key));
        const records = bestServantArray(parsed);
        if (records.length) candidates.push({ key, records });
      }
    } catch (_) {}

    candidates.sort((a, b) => b.records.length - a.records.length);
    return candidates.length ? candidates[0] : { key: '', records: [] };
  }

  function normalizeEffectRecord(item) {
    if (!isObject(item)) return null;
    const result = { ...item };
    if (!result.id) {
      result.id = String(item.pageId || item.page_id || core.pageIdFromHref(item.url || item.href || item.pageUrl || item.page_url) || '');
    }
    if (!result.name) result.name = item.servantName || item.servant_name || item.title || '';
    if (!result.url) result.url = item.href || item.pageUrl || item.page_url || '';
    if (!result.className) result.className = item.className || item.class_name || item.class || '';
    if (!result.rarity) result.rarity = item.rarity || item.rare || null;
    return result;
  }

  function buildUnifiedData() {
    const traitApi = window.RaFGOTraitFilterCore;
    const traitRecords = traitApi && typeof traitApi.getServants === 'function' ? traitApi.getServants() : [];
    const effectCandidate = findEffectRecords();
    const effectRecords = effectCandidate.records.map(normalizeEffectRecord).filter(Boolean);

    let unified = core.mergeServantRecords([], traitRecords, 'traitData');
    unified = core.mergeServantRecords(unified, effectRecords, 'effectData');

    unified = unified.map(record => ({
      id: record.id || (record.traitData && record.traitData.id) || (record.effectData && record.effectData.id) || '',
      name: record.name || (record.traitData && record.traitData.name) || (record.effectData && record.effectData.name) || '',
      className: record.className || (record.traitData && record.traitData.className) || (record.effectData && record.effectData.className) || '',
      rarity: record.rarity || (record.traitData && record.traitData.rarity) || (record.effectData && record.effectData.rarity) || null,
      url: record.url || (record.traitData && record.traitData.url) || (record.effectData && record.effectData.url) || '',
      traits: record.traitData && Array.isArray(record.traitData.traits) ? record.traitData.traits : [],
      effects: record.effectData || null
    }));

    core.writeUnifiedServants(unified);
    try {
      window.dispatchEvent(new CustomEvent('ra-fgo-unified-data-updated', {
        detail: { servantCount: unified.length }
      }));
    } catch (_) {}

    return {
      servants: unified,
      traitCount: traitRecords.length,
      effectCount: effectRecords.length,
      effectCacheKey: effectCandidate.key
    };
  }

  function getServants() {
    return core.readUnifiedServants();
  }

  window.RaFGOUnifiedData = Object.freeze({
    version: VERSION,
    build: buildUnifiedData,
    getServants,
    findEffectRecords
  });
})();
