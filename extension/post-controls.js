(() => {
  'use strict';
  const I = globalThis.FBUnhookI18n, t = I.t;
  function create(doc, send) {
    const entries = new Map();
    function remove(unit) { entries.get(unit)?.host.remove(); entries.delete(unit); }
    return {
      update(unit, group) {
        if (!group) { remove(unit); return; }
        let entry = entries.get(unit);
        if (entry && !entry.host.isConnected) { remove(unit); entry = null; }
        if (!entry) {
          const heading = unit.querySelector('h3,h4,[role="heading"]');
          const close = [...unit.querySelectorAll('[aria-label]')].find(e => /^(Ukryj post|Hide post|Remove post)/i.test(e.getAttribute('aria-label')));
          let anchor = close;
          while (anchor?.parentElement && anchor.parentElement !== unit && !anchor.parentElement.contains(heading)) anchor = anchor.parentElement;
          const host = doc.createElement('span'); host.setAttribute('data-fbu-control', '');
          const shadow = host.attachShadow({ mode: 'closed' });
          shadow.innerHTML = `<style>:host{display:inline-flex;align-self:flex-start;align-items:center;margin:8px 4px 0 0;flex-shrink:0}button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:5px;padding:5px;border-radius:6px;color:var(--secondary-text,#65676b);font:11px Segoe UI,system-ui,sans-serif}button:hover{background:var(--comment-background,#f0f2f5)}button:focus-visible{outline:2px solid #0866ff}button:disabled{opacity:.5;cursor:wait}.track{width:26px;height:16px;background:var(--primary-button-background,#0866ff);border-radius:10px;position:relative}.track:after{content:'';position:absolute;top:3px;right:3px;width:10px;height:10px;border-radius:50%;background:#fff}</style><button type="button" role="switch" aria-checked="true"><span class="label"></span><span class="track" aria-hidden="true"></span></button>`;
          const button = shadow.querySelector('button');
          entry = { host, button, group }; entries.set(unit, entry);
          button.addEventListener('click', async event => {
            event.preventDefault(); event.stopPropagation(); button.disabled = true;
            try {
              const result = await send({ type: 'group-visibility', id: entry.group.id, visible: false });
              if (result?.error) throw new Error(result.error);
            } catch { button.title = t('saveError'); }
            finally { button.disabled = false; }
          });
          if (anchor?.parentElement && anchor.parentElement !== unit) anchor.before(host);
          else if (heading) heading.parentElement.append(host);
          else { remove(unit); return; }
        }
        entry.group = group;
        entry.host.lang = I.language;
        const text = entry.button.querySelector('.label');
        if (text.textContent !== t('group')) text.textContent = t('group');
        const label = t('showGroup', { name: group.name });
        if (entry.button.getAttribute('aria-label') !== label) {
          entry.button.setAttribute('aria-label', label);
          entry.button.title = t('hideGroupHelp');
        }
      },
      prune(units) { for (const unit of entries.keys()) if (!units.has(unit) || !unit.isConnected) remove(unit); },
      clear() { for (const unit of entries.keys()) remove(unit); }
    };
  }
  globalThis.FBUnhookPostControls = { create };
})();
