/* Shared, DOM-only classification. No Facebook private APIs or tracking. */
(function (root) {
  'use strict';
  const SETTINGS = ['enabled', 'groupsOnly', 'hideReels', 'hideStories', 'hideSidebar', 'hideShortcuts', 'hideComposer', 'hideContacts', 'hideMessageButton', 'minimalNavigation'];
  const DEFAULTS = { enabled: true, groupsOnly: true, hideReels: true, hideStories: true, hideSidebar: true, hideShortcuts: true, hideComposer: true, hideContacts: true, hideMessageButton: true, minimalNavigation: true, groups: [], disabledGroups: [], lastSync: null, sync: null };
  const RESERVED = new Set(['feed', 'joins', 'discover', 'create', 'notifications', 'search', 'category', 'you', 'members']);
  function groupKey(href) {
    try {
      const url = new URL(href, 'https://www.facebook.com');
      if (!['www.facebook.com', 'facebook.com', 'm.facebook.com'].includes(url.hostname) || !['https:', 'http:'].includes(url.protocol)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'groups' || !parts[1]) return null;
      const key = decodeURIComponent(parts[1]).toLowerCase();
      return /^[a-z0-9._-]+$/.test(key) && !RESERVED.has(key) ? key : null;
    } catch { return null; }
  }
  function isGroupRoot(href) {
    try { return !!groupKey(href) && new URL(href, 'https://www.facebook.com').pathname.split('/').filter(Boolean).length === 2; }
    catch { return false; }
  }
  function route(pathname) {
    const p = pathname.replace(/\/+$/, '') || '/';
    if (p === '/groups/joins') return 'joins';
    if (p === '/' || p === '/home.php' || p === '/groups/feed' || p === '/groups') return 'feed';
    return 'other';
  }
  function postUnits(doc) {
    // A feed child can wrap every post AND the pagination sentinels. Never hide that shared wrapper.
    const result = new Set();
    const pageletSelector = '[data-pagelet^="FeedUnit_"]';
    for (const unit of doc.querySelectorAll(`[role="main"] ${pageletSelector}, [role="feed"] ${pageletSelector}`)) {
      if (!unit.closest('[role="dialog"]') && !unit.parentElement.closest(pageletSelector)) result.add(unit);
    }
    for (const feed of doc.querySelectorAll('[role="feed"]')) {
      if (feed.closest('[role="dialog"]')) continue;
      for (const article of feed.querySelectorAll('[role="article"]')) {
        if (article.closest(pageletSelector) || article.parentElement.closest('[role="article"]') || article.closest('[role="dialog"]')) continue;
        if (article.querySelector('h3 a[href], h4 a[href]')) result.add(article);
      }
      for (const child of feed.children) {
        if (/^H[1-6]$/.test(child.tagName) || child.matches(pageletSelector) || child.querySelector(`${pageletSelector}, [role="article"]`)) continue;
        if (child.querySelector('h3 a[href], h4 a[href]')) result.add(child);
      }
    }
    return [...result];
  }
  function sourceIdentity(unit) {
    // Identity must come from the source header, never text, comments or shared posts.
    const heading = unit.querySelector('h3, h4, [role="heading"]');
    const roots = [...new Set([...(heading?.querySelectorAll('a[href]') || [])]
      .filter(a => isGroupRoot(a.href)).map(a => groupKey(a.href)))];
    if (roots.length !== 1) return { keys: roots, alias: null };
    const id = roots[0];
    const keys = new Set();
    // Stop at the nearest source row, before entering the post body or shared content.
    for (let region = heading.parentElement; region && region !== unit; region = region.parentElement) {
      if (region.querySelectorAll('h3,h4,[role="heading"]').length !== 1 ||
          region.querySelector('p,blockquote,[role="article"],[data-ad-preview],[data-ad-comet-preview]')) break;
      let hasSourceLink = false;
      for (const a of region.querySelectorAll('a[href]')) {
        const url = new URL(a.href, 'https://www.facebook.com');
        if (/^\/groups\/[^/]+\/(user|posts|permalink)\//.test(url.pathname) ||
            (isGroupRoot(a.href) && url.searchParams.has('multi_permalinks'))) {
          const key = groupKey(a.href);
          if (key) { hasSourceLink = true; if (key !== id) keys.add(key); }
        }
      }
      if (hasSourceLink) break;
    }
    // Conflicting IDs or two different vanity names are not evidence of equivalence.
    const other = keys.size === 1 ? [...keys][0] : null;
    const pair = other && /^\d+$/.test(id) !== /^\d+$/.test(other);
    return { keys: pair ? [id, other] : roots, alias: pair ? { id, alias: other } : null };
  }
  function sourceKeys(unit) { return sourceIdentity(unit).keys; }
  function postGroupAlias(unit, groups) {
    const evidence = sourceIdentity(unit).alias;
    if (!evidence) return null;
    const owners = groups.filter(g => [g.id, ...(g.aliases || [])].includes(evidence.id));
    if (owners.length !== 1) return null;
    const group = owners[0];
    if ([group.id, ...(group.aliases || [])].includes(evidence.alias) ||
        groups.some(g => g !== group && [g.id, ...(g.aliases || [])].includes(evidence.alias))) return null;
    return { id: group.id, alias: evidence.alias };
  }
  function groupEnabled(group, disabledGroups = []) {
    return ![group.id, ...(group.aliases || [])].some(id => disabledGroups.includes(id));
  }
  function classify(unit, groups, disabledGroups = []) {
    const keys = sourceKeys(unit);
    const group = groups.find(g => [g.id, ...(g.aliases || [])].some(id => keys.includes(id)));
    const blocked = keys.some(id => disabledGroups.includes(id)) || !!group && !groupEnabled(group, disabledGroups);
    return { visible: !!group && !blocked, blocked, group, reason: blocked ? 'disabled-group' : keys.length ? 'other-group' : 'not-group', keys };
  }
  function joinedGroups(doc, records = []) {
    const numericByKey = new Map();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !/^\d{1,30}$/.test(record.id) || !isGroupRoot(record.url)) continue;
      const key = groupKey(record.url);
      if (/^\d+$/.test(key) && key !== record.id) continue;
      const ids = numericByKey.get(key) || new Set(); ids.add(record.id); numericByKey.set(key, ids);
    }
    const heading = [...doc.querySelectorAll('[role="main"] h2, [role="main"] [role="heading"]')]
      .find(e => /^(Wszystkie grupy, do których należysz|All groups you.ve joined|All groups you joined|Groups you.ve joined)\s*(\(|$)/i.test(e.textContent.trim()));
    if (!heading) return { recognized: false, total: null, groups: [] };
    const totalText = heading.textContent.match(/\(([\d\s,.]+)\)/)?.[1];
    const total = totalText === undefined ? null : Number(totalText.replace(/\D/g, ''));
    // Use only the list next to this heading, excluding recommended groups and sidebar shortcuts.
    let section = heading.parentElement;
    while (section && !section.querySelector('[role="list"]') && section.getAttribute('role') !== 'main') section = section.parentElement;
    const list = section?.querySelector('[role="list"]');
    const groups = new Map();
    for (const a of list?.querySelectorAll('a[href]') || []) {
      if (!isGroupRoot(a.href)) continue;
      const id = groupKey(a.href);
      const name = a.textContent.trim().replace(/\s+/g, ' ');
      if (!name || /^(Zobacz grupę|View group|Visit group)$/i.test(name)) continue;
      const candidates = numericByKey.get(id);
      const numeric = /^\d+$/.test(id) ? id : candidates?.size === 1 ? [...candidates][0] : null;
      groups.set(id, { id: numeric || id, sourceKey: id, name: name.slice(0, 200), aliases: numeric && numeric !== id ? [id] : [] });
    }
    return { recognized: true, total, groups: [...groups.values()] };
  }
  const api = { DEFAULTS, SETTINGS, groupKey, isGroupRoot, route, postUnits, sourceKeys, groupEnabled, classify, joinedGroups, postGroupAlias };
  root.FBUnhook = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
