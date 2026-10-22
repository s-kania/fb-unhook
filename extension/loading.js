(() => {
  'use strict';
  const I = globalThis.FBUnhookI18n, t = I.t;
  const skeletons = doc => [...(doc.querySelector('[role="feed"]') || doc.querySelector('[role="main"]') || doc.createElement('div')).querySelectorAll('[aria-label],[role="progressbar"]')].filter(e =>
    (/^(Ładowanie|Loading)(?:[.…\s]|$)/i.test(e.getAttribute('aria-label') || '') || e.getAttribute('role') === 'progressbar') &&
    !e.closest('[data-pagelet^="FeedUnit_"],[data-fbu-hidden],[data-fbu-ui-hidden],[role="dialog"]'));
  function create(doc, now = () => Date.now()) {
    const win = doc.defaultView;
    let seen = new WeakSet(), loaded = 0, feedKey = '';
    let host, counter, status, previous = new Set(), lastProgress = now(), signature = '', lastRoute = '', wasPending = false;
    function restore() { for (const e of previous) e.removeAttribute('data-fbu-loading-placeholder'); previous.clear(); }
    function mount() {
      if (host?.isConnected) return;
      host = doc.createElement('aside'); host.id = 'facebook-unhook-loading'; host.hidden = true;
      const shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `<style>
        :host{position:absolute;z-index:9;pointer-events:none;box-sizing:border-box;font-family:Segoe UI,system-ui,sans-serif;color:var(--primary-text,#1c1e21)}:host([hidden]){display:none!important}
        .loader{position:relative;display:grid;place-items:center;width:34px;height:34px;margin:auto;text-align:center}
        .orbit{position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;border:2px solid #0866ff28;border-top-color:#0866ff;border-right-color:#65a5ff;border-radius:50%;animation:spin 1s linear infinite}
        .count{position:relative;font-size:10px;line-height:14px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--secondary-text,#65676b)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.orbit{animation:none}}
      </style><div class="loader" role="status" aria-label="Loading posts"><div class="orbit" aria-hidden="true"></div><span class="count" aria-hidden="true">0</span></div>`;
      counter = shadow.querySelector('.count');
      status = shadow.querySelector('[role="status"]');
      doc.body.append(host);
    }
    return {
      update({ enabled, ready, route, units, shown, configured = true, path = route }) {
        if (!doc.body) return false;
        if (!enabled || route !== 'feed') { restore(); if (host) host.hidden = true; wasPending = false; feedKey = ''; return false; }
        if (path !== feedKey) { seen = new WeakSet(); loaded = 0; feedKey = path; }
        // Count each rendered post once, including filtered posts, not empty skeletons.
        for (const unit of units) {
          if (!seen.has(unit) && unit.querySelector('h3,h4')) { seen.add(unit); loaded++; }
        }
        const key = `${loaded}:${shown}`;
        if (key !== signature || route !== lastRoute) { lastProgress = now(); signature = key; lastRoute = route; }
        const candidates = skeletons(doc).filter(e => {
          const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
        });
        const nearby = candidates.find(e => { const r = e.getBoundingClientRect(); return r.bottom > 60 && r.top < win.innerHeight + 100; });
        const pending = !ready || !!nearby || shown === 0;
        if (pending && !wasPending) lastProgress = now();
        wasPending = pending;
        const busy = configured && pending && now() - lastProgress < 20000;
        if (!pending) { restore(); if (host) host.hidden = true; return false; }
        mount();
        host.lang = I.language;
        const count = String(loaded);
        if (counter.textContent !== count) counter.textContent = count;
        status.setAttribute('aria-label', t('loaded', { count }));
        host.hidden = !busy; host.toggleAttribute('data-idle', !busy);
        const feed = doc.querySelector('[role="feed"]');
        const reference = nearby || units.find(e => !e.hasAttribute('data-fbu-hidden')) || feed;
        const rect = reference?.getBoundingClientRect();
        const width = Math.min(64, rect?.width > 180 ? rect.width - 32 : win.innerWidth - 40);
        const center = rect?.width > 180 ? rect.left + rect.width / 2 : win.innerWidth / 2;
        host.style.width = `${width}px`; host.style.left = `${Math.max(16, center - width / 2) + win.scrollX}px`;
        // Float over the native loading placeholder, preserving its pagination geometry.
        host.style.top = `${win.scrollY + (shown && nearby ? Math.max(80, nearby.getBoundingClientRect().top + 24) : 150)}px`;
        const next = new Set(nearby ? candidates : []);
        for (const e of previous) if (!next.has(e)) e.removeAttribute('data-fbu-loading-placeholder');
        for (const e of next) e.setAttribute('data-fbu-loading-placeholder', 'true');
        previous = next;
        return busy;
      },
      clear() { restore(); host?.remove(); host = null; seen = new WeakSet(); loaded = 0; feedKey = ''; }
    };
  }
  globalThis.FBUnhookLoading = { create, skeletons };
  if (typeof module !== 'undefined') module.exports = globalThis.FBUnhookLoading;
})();
