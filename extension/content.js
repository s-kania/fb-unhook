(() => {
  'use strict';
  const C = globalThis.FBUnhook;
  const I = globalThis.FBUnhookI18n, t = I.t;
  const layout = globalThis.FBUnhookLayout.create(document);
  let state = { ...C.DEFAULTS }, tabId, timer, panel, view, syncing = false, dead = false;
  let stats = { shown: 0, hidden: 0, route: C.route(location.pathname) };
  const marked = new Set();
  const learnedAliases = new Set();
  const joinedRecords = new Map();
  addEventListener('message', event => {
    if (C.route(location.pathname) !== 'joins' || event.source !== window || event.origin !== location.origin ||
        event.data?.type !== 'facebook-unhook:joined-data:v1' || !Array.isArray(event.data.groups)) return;
    for (const record of event.data.groups.slice(0, 10000)) {
      if (!record || typeof record.id !== 'string' || !/^\d{1,30}$/.test(record.id) ||
          typeof record.url !== 'string' || record.url.length > 2048 || !C.isGroupRoot(record.url)) continue;
      if (joinedRecords.size < 10000) joinedRecords.set(`${record.id}:${record.url}`, { id: record.id, url: record.url });
    }
  });
  const send = message => chrome.runtime.sendMessage(message);
  const postControls = globalThis.FBUnhookPostControls.create(document, send);
  const loading = globalThis.FBUnhookLoading.create(document);
  let initialized = false;
  // CSS hides the initial main view until local settings and the first filter pass are ready.
  function guard(enabled) {
    document.documentElement.toggleAttribute('data-fbu-guard', enabled);
  }
  guard(C.route(location.pathname) === 'feed');
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function schedule() {
    if (!timer && !dead) timer = setTimeout(() => { timer = null; refresh(); }, 100);
  }
  function active() { return state.enabled && (state.groupsOnly || state.disabledGroups.length > 0); }
  function panelUI() {
    if (panel?.isConnected) return;
    panel = document.createElement('aside');
    panel.id = 'facebook-unhook-panel'; panel.lang = I.language;
    const shadow = panel.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `<style>
      :host{position:fixed;z-index:10;font-family:Segoe UI,system-ui,sans-serif;color:var(--primary-text,#1c1e21)}:host([hidden]){display:none!important}
      section{box-sizing:border-box;padding:12px 14px;border-radius:10px;background:var(--card-background,#fff);border:1px solid var(--divider,#dddfe2);font-size:11px;line-height:1.5}
      header{display:flex;align-items:center;gap:8px}.logo{width:24px;height:24px;display:grid;place-items:center;background:var(--primary-button-background,#0866ff);color:white;border-radius:7px;font-size:19px;font-weight:700}strong{font-size:13px}small,p{color:var(--secondary-text,#65676b)}small{display:block}p{margin:10px 0 8px}.stats{display:flex;gap:12px;margin:8px 0;color:var(--secondary-text,#65676b)}b{color:var(--primary-text,#1c1e21);font-variant-numeric:tabular-nums}a{color:var(--primary-text,#1c1e21);text-decoration:none;font-size:11px}a:hover{text-decoration:underline}a:focus-visible{outline:2px solid #0866ff;outline-offset:2px}
    </style><section aria-label="Facebook Unhook"><header><span class="logo" aria-hidden="true">u</span><div><strong>Facebook Unhook</strong><small id="group-count"></small></div></header><div class="stats"><span><b id="shown">0</b> <span id="shown-label"></span></span><span><b id="hidden">0</b> <span id="hidden-label"></span></span></div><a id="group-feed" href="https://www.facebook.com/groups/feed/"></a></section>`;
    view = Object.fromEntries(['group-count', 'shown', 'hidden', 'shown-label', 'hidden-label', 'group-feed'].map(id => [id, shadow.getElementById(id)]));
    document.body.append(panel);
  }
  function updatePanel(sidebar, kind) {
    const rect = sidebar?.getBoundingClientRect();
    // Facebook removes the left rail on small screens. Never cover the feed in that case.
    if (!state.enabled || kind !== 'feed' || !rect || rect.width < 180 || rect.height < 1) { if (panel) panel.hidden = true; return; }
    panelUI(); panel.hidden = false;
    panel.style.left = `${Math.max(8, rect.left + 12)}px`;
    panel.style.top = `${Math.max(72, rect.top + 16)}px`;
    panel.style.width = `${Math.min(260, rect.width - 24)}px`;
    panel.style.maxHeight = `${Math.max(200, innerHeight - Math.max(72, rect.top + 16) - 16)}px`;
    panel.style.overflowY = 'auto';
    const values = {
      'group-count': t('groupCount', { enabled: state.groups.filter(g => C.groupEnabled(g, state.disabledGroups)).length, total: state.groups.length }),
      'shown-label': t('shown'), 'hidden-label': t('hidden'), 'group-feed': t('groupFeed'),
      shown: String(stats.shown), hidden: String(stats.hidden)
    };
    for (const [key, value] of Object.entries(values)) if (view[key].textContent !== value) view[key].textContent = value;
  }
  function refresh() {
    if (dead || !document?.body) return;
    I.setLanguage(state.language);
    if (panel) panel.lang = I.language;
    const kind = C.route(location.pathname);
    const ui = layout.apply(state);
    const filtering = active() && kind === 'feed';
    guard(filtering);
    const units = kind === 'feed' ? C.postUnits(document) : [];
    const current = new Set(units);
    postControls.prune(current);
    for (const el of marked) {
      if (!filtering || !current.has(el) || !el.isConnected) { el.removeAttribute('data-fbu-hidden'); marked.delete(el); }
    }
    stats = { shown: 0, hidden: 0, route: kind, filtering };
    for (const unit of units) {
      const evidence = state.enabled ? C.postGroupAlias(unit, state.groups) : null;
      if (evidence) {
        const key = `${evidence.id}:${evidence.alias}`;
        if (!learnedAliases.has(key)) {
          learnedAliases.add(key);
          void send({ type: 'post-group-alias', ...evidence }).then(result => {
            if (result?.error) learnedAliases.delete(key);
          }).catch(() => learnedAliases.delete(key));
        }
      }
      const decision = C.classify(unit, state.groups, state.disabledGroups);
      const visible = !filtering || (!decision.blocked && (!state.groupsOnly || decision.visible));
      postControls.update(unit, state.enabled && visible && !unit.closest('[data-fbu-ui-hidden]') ? decision.group : null);
      if (visible) {
        unit.removeAttribute('data-fbu-hidden'); marked.delete(unit);
        if (unit.closest('[data-fbu-ui-hidden]')) stats.hidden++; else stats.shown++;
      } else {
        unit.setAttribute('data-fbu-hidden', 'true'); marked.add(unit); stats.hidden++;
        // Stop media only inside a hidden post, never elsewhere on Facebook.
        for (const media of unit.querySelectorAll('video, audio')) if (!media.paused) media.pause();
      }
      unit.setAttribute('data-fbu-reviewed', 'true');
      if (unit.closest('[data-fbu-ui-hidden]')) for (const media of unit.querySelectorAll('video,audio')) if (!media.paused) media.pause();
    }
    document.documentElement.setAttribute('data-fbu-ready', 'true');
    const ourSync = state.sync?.tabId === tabId;
    loading.update({ enabled: state.enabled, ready: initialized, route: kind, path: location.pathname, units, shown: stats.shown, configured: !state.groupsOnly || state.groups.some(g => C.groupEnabled(g, state.disabledGroups)) });
    updatePanel(ui.sidebar, kind);
    if (kind === 'joins' && ourSync && state.sync.status === 'running' && !syncing) void syncGroups();
  }
  async function syncGroups() {
    syncing = true;
    const startedAt = state.sync.startedAt;
    const found = new Map();
    window.postMessage({ type: 'facebook-unhook:joined-request:v1' }, location.origin);
    let total = null, lastCount = -1, stalled = 0;
    try {
      for (let round = 0; round < 160; round++) {
        if (dead || state.sync?.status !== 'running' || state.sync.startedAt !== startedAt || C.route(location.pathname) !== 'joins') return;
        const snapshot = C.joinedGroups(document, [...joinedRecords.values()]);
        if (snapshot.recognized) {
          total = snapshot.total;
          for (const g of snapshot.groups) found.set(g.sourceKey, g);
          const count = [...found.values()].filter(g => /^\d+$/.test(g.id)).length;
          const complete = total !== null && found.size === total && count === total;
          if (count !== lastCount || complete) {
            await send({ type: 'sync-result', groups: [...found.values()], total, complete, done: complete, startedAt });
            lastCount = count; stalled = 0;
          } else stalled++;
          if (complete) return;
          // Follow Facebook's own pagination using only the rendered joined-groups list.
          const main = [...document.querySelectorAll('[role="main"]')].find(e => e.querySelector('[role="list"]'));
          const list = main?.querySelector('[role="list"]');
          list?.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'instant' });
          if (stalled > 25) break;
        }
        await delay(650);
      }
      await send({ type: 'sync-result', groups: [...found.values()], total, complete: false, done: true, startedAt });
    } catch { /* Extension reload or a closed tab: existing membership list stays intact. */ }
    finally { syncing = false; }
  }
  const observer = new MutationObserver(records => {
    if (!initialized || dead) return;
    // Re-check reused post containers in the same microtask, before the browser paints them.
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      target?.closest('[data-pagelet^="FeedUnit_"],[role="article"]')?.removeAttribute('data-fbu-reviewed');
    }
    refresh();
  });
  async function init() {
    try {
      state = { ...C.DEFAULTS, ...await chrome.storage.local.get(null) };
      tabId = (await send({ type: 'hello' })).tabId;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        for (const [key, change] of Object.entries(changes)) state[key] = change.newValue;
        schedule();
      });
      chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message.type === 'status') { refresh(); reply(stats); }
      });
      initialized = true;
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'data-pagelet', 'role'] });
      // Also catches SPA route and theme changes without patching Facebook's history API.
      const heartbeat = setInterval(() => {
        if (!chrome.runtime?.id) {
          dead = true; observer.disconnect(); clearInterval(heartbeat);
          for (const el of marked) el.removeAttribute('data-fbu-hidden');
          layout.clear(); postControls.clear(); loading.clear(); guard(false); panel?.remove(); return;
        }
        schedule();
      }, 1000);
      refresh();
    } catch { loading.clear(); guard(false); document.documentElement.setAttribute('data-fbu-ready', 'true'); }
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  void init();
})();
