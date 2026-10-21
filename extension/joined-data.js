/* Read only the joined-group connection already delivered to this page by Facebook. */
(function (root) {
  'use strict';
  const DATA = 'facebook-unhook:joined-data:v1', REQUEST = 'facebook-unhook:joined-request:v1';
  function extract(value) {
    const groups = [], stack = [value];
    let visited = 0;
    while (stack.length && visited++ < 100000) {
      const item = stack.pop();
      if (!item || typeof item !== 'object') continue;
      const edges = item.all_joined_groups?.tab_groups_list?.edges;
      if (Array.isArray(edges)) for (const edge of edges) {
        const node = edge?.node;
        if (node?.__typename !== 'Group' || node.viewer_join_state !== 'MEMBER' ||
            typeof node.id !== 'string' || !/^\d{1,30}$/.test(node.id) ||
            typeof node.url !== 'string' || typeof node.name !== 'string') continue;
        groups.push({ id: node.id, url: node.url, name: node.name.slice(0, 200) });
      }
      for (const child of Object.values(item)) if (child && typeof child === 'object') stack.push(child);
    }
    return groups;
  }
  function parse(text) {
    if (typeof text !== 'string' || text.length > 16000000 || !text.includes('all_joined_groups')) return [];
    const clean = text.replace(/^for\s*\(;;\);\s*/, '');
    try { return extract(JSON.parse(clean)); } catch { /* Facebook can stream newline-delimited responses. */ }
    return clean.split('\n').flatMap(line => { try { return extract(JSON.parse(line)); } catch { return []; } });
  }
  function install(win) {
    const onList = () => /^\/groups\/joins\/?$/.test(win.location.pathname);
    const endpoint = value => {
      try { const url = new URL(value, win.location.href); return url.origin === 'https://www.facebook.com' && /^\/api\/graphql\/?$/.test(url.pathname); }
      catch { return false; }
    };
    const records = new Map();
    const publish = () => { if (onList()) win.postMessage({ type: DATA, groups: [...records.values()] }, win.location.origin); };
    function ingest(text) {
      if (!onList()) return;
      let changed = false;
      for (const group of parse(text)) {
        const key = `${group.id}:${group.url}`;
        if (!records.has(key) && records.size < 10000) { records.set(key, group); changed = true; }
      }
      if (changed) publish();
    }
    const seenScripts = new WeakMap();
    function readScript(script) {
      if (!script.matches?.('script[type="application/json"]')) return;
      const text = script.textContent;
      if (seenScripts.get(script) === text.length) return;
      seenScripts.set(script, text.length); ingest(text);
    }
    const observer = new win.MutationObserver(records => {
      if (!onList()) return;
      for (const record of records) {
        readScript(record.target);
        for (const node of record.addedNodes) {
          readScript(node);
          for (const script of node.querySelectorAll?.('script[type="application/json"]') || []) readScript(script);
        }
      }
    });
    observer.observe(win.document, { childList: true, subtree: true });
    for (const script of win.document.querySelectorAll('script[type="application/json"]')) readScript(script);
    win.addEventListener('message', event => {
      if (event.source === win && event.origin === win.location.origin && event.data?.type === REQUEST) publish();
    });
    // Observe responses; do not create, change or replay Facebook requests.
    const originalFetch = win.fetch;
    if (originalFetch) win.fetch = function (...args) {
      const result = originalFetch.apply(this, args);
      if (onList()) result.then(response => {
        if (onList() && endpoint(response.url)) response.clone().text().then(ingest).catch(() => {});
      }).catch(() => {});
      return result;
    };
    const xhr = win.XMLHttpRequest?.prototype, originalOpen = xhr?.open, listeners = new WeakMap();
    if (originalOpen) xhr.open = function (...args) {
      const old = listeners.get(this);
      if (old) this.removeEventListener('load', old);
      if (onList() && endpoint(args[1])) {
        const listener = () => { try { if (onList() && endpoint(this.responseURL)) ingest(this.responseText); } catch { /* Non-text or aborted response. */ } };
        listeners.set(this, listener); this.addEventListener('load', listener, { once: true });
      }
      return originalOpen.apply(this, args);
    };
  }
  if (typeof module !== 'undefined') module.exports = { extract, parse, install, DATA, REQUEST };
  else install(root);
})(globalThis);
