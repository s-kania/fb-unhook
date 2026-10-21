(() => {
  'use strict';
  const C = globalThis.FBUnhook;
  const text = e => (e?.textContent || '').trim();
  const headings = root => [...root.querySelectorAll('h1,h2,h3,h4,[role="heading"]')];
  const path = a => { try { return new URL(a.href, 'https://www.facebook.com').pathname; } catch { return ''; } };
  const inPost = e => e.closest('[data-pagelet^="FeedUnit_"],[role="article"]');
  function leftSidebar(doc) {
    return [...doc.querySelectorAll('[role="navigation"],[role="complementary"]')].find(el =>
      /^(Skróty|Shortcuts)$/i.test(el.getAttribute('aria-label') || '') ||
      headings(el).some(h => /^(Menu Facebooka|Facebook menu)$/i.test(text(h)))) || null;
  }
  function linkItem(a, nav) {
    const item = a.closest('li,[role="listitem"]');
    if (item && nav.contains(item)) return item;
    return a.parentElement !== nav && a.parentElement.querySelectorAll('a').length === 1 ? a.parentElement : a;
  }
  function targets(doc, state) {
    const hidden = new Set();
    const sidebar = leftSidebar(doc);
    if (!state.enabled) return { hidden, sidebar: null };
    if (state.minimalNavigation) {
      for (const nav of doc.querySelectorAll('[role="navigation"][aria-label="Facebook"]')) {
        const links = [...nav.querySelectorAll('a[href]')];
        // Only the primary tab strip, not account actions or the footer.
        if (!links.some(a => path(a) === '/') || !links.some(a => path(a).startsWith('/marketplace'))) continue;
        for (const a of links) if (path(a) !== '/' && !path(a).startsWith('/marketplace')) hidden.add(linkItem(a, nav));
      }
    }
    if (sidebar && state.hideShortcuts) {
      const heading = headings(sidebar).find(h => /^(Twoje skróty|Your shortcuts)$/i.test(text(h)));
      if (heading) {
        let container = heading;
        while (container.parentElement && container.parentElement !== sidebar && !container.nextElementSibling) container = container.parentElement;
        hidden.add(container);
        // Facebook renders the heading, list and Show more button as adjacent blocks.
        let sibling = container.nextElementSibling;
        while (sibling && (sibling.matches('ul,[role="list"],button,[role="button"]') || /^(Wyświetl więcej skrótów|See more shortcuts)$/i.test(text(sibling)))) {
          hidden.add(sibling); sibling = sibling.nextElementSibling;
        }
      }
    }
    if (state.hideContacts) {
      for (const rail of doc.querySelectorAll('[data-pagelet="RightRail"],[role="complementary"]')) {
        if (inPost(rail) || rail.closest('[role="dialog"]')) continue;
        if (rail.getAttribute('data-pagelet') !== 'RightRail' && rail.querySelector('[data-pagelet="RightRail"]')) continue;
        const markers = headings(rail).filter(h => /^(Kontakty|Contacts|Czaty grupowe|Group chats|Community chats)$/i.test(text(h)));
        // Expanded lists are siblings of the header, sometimes with their own chat headings.
        for (const list of rail.querySelectorAll('ul,[role="list"]')) {
          if (list.querySelector('a[href*="/messages/t/"]')) markers.push(list);
        }
        for (const marker of markers) {
          let section = marker;
          while (section.parentElement && section.parentElement !== rail) section = section.parentElement;
          hidden.add(section);
        }
      }
    }
    if (state.hideMessageButton) {
      for (const button of doc.querySelectorAll('[role="button"][aria-label],button[aria-label]')) {
        if (!/^(Nowa wiadomość|New message)$/i.test(button.getAttribute('aria-label'))) continue;
        if (!button.closest('[role="main"],main,[role="feed"],[role="dialog"],[role="navigation"]') && !inPost(button)) hidden.add(button);
      }
    }
    if (state.hideComposer && C.route(doc.location.pathname) === 'feed') {
      for (const region of doc.querySelectorAll('[role="region"][aria-label="Utwórz post"],[role="region"][aria-label="Create a post"],[role="region"][aria-label="Create post"]')) {
        if (!inPost(region) && !region.closest('[role="dialog"]')) hidden.add(region);
      }
    }
    if (state.hideStories) {
      for (const region of doc.querySelectorAll('[role="region"][aria-label="Relacje"],[role="region"][aria-label="Stories"],[data-pagelet*="Stories"]')) {
        if (!inPost(region)) hidden.add(region);
      }
      for (const h of headings(doc)) {
        if (!/^(Relacje|Stories)$/i.test(text(h)) || inPost(h)) continue;
        const region = h.closest('[role="region"]');
        if (region) hidden.add(region);
      }
    }
    if (state.hideReels) {
      for (const nav of doc.querySelectorAll('[role="navigation"]')) {
        for (const a of nav.querySelectorAll('a[href]')) if (/^\/reels?\/?$/.test(path(a))) hidden.add(linkItem(a, nav));
      }
      for (const feed of doc.querySelectorAll('[role="feed"]')) {
        for (const h of headings(feed)) {
          if (!/^(Rolki|Reels)$/i.test(text(h))) continue;
          const unit = h.closest('[data-pagelet^="FeedUnit_"]');
          if (unit) hidden.add(unit);
          else {
            let box = h.parentElement;
            // Find the small carousel wrapper, stopping before the shared feed container.
            for (let i = 0; box && box !== feed && i < 5; i++, box = box.parentElement) {
              if (box.querySelectorAll('[data-pagelet^="FeedUnit_"]').length > 1) break;
              if (box.querySelector('a[href*="/reel/"]') && !box.querySelector('h4 a[href*="/groups/"]')) { hidden.add(box); break; }
            }
          }
        }
        // Individual reel posts: recognize the timestamp/permalink rather than a link in the text.
        for (const unit of C.postUnits(doc)) {
          const h = unit.querySelector('h3,h4,[role="heading"]');
          if (!h) continue;
          const links = [...unit.querySelectorAll('a[href]')];
          for (const a of links) {
            if (!/^\/reel\/[^/]+/.test(path(a))) continue;
            if (a.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"]')) continue;
            const label = a.getAttribute('aria-label') || text(a);
            if (/\b(temu|godz\.|min|dni|dzień|hours?|minutes?|days?|ago)\b/i.test(label)) hidden.add(unit);
          }
        }
      }
    }
    return { hidden, sidebar: state.hideSidebar ? sidebar : null };
  }
  function create(doc) {
    let previous = new Set(), oldSidebar;
    return {
      apply(state) {
        const result = targets(doc, state);
        for (const e of previous) if (!result.hidden.has(e)) e.removeAttribute('data-fbu-ui-hidden');
        for (const e of result.hidden) if (!e.hasAttribute('data-fbu-ui-hidden')) e.setAttribute('data-fbu-ui-hidden', 'true');
        if (oldSidebar && oldSidebar !== result.sidebar) oldSidebar.removeAttribute('data-fbu-sidebar');
        if (result.sidebar) result.sidebar.setAttribute('data-fbu-sidebar', 'true');
        previous = result.hidden; oldSidebar = result.sidebar;
        return result;
      },
      clear() {
        for (const e of previous) e.removeAttribute('data-fbu-ui-hidden');
        oldSidebar?.removeAttribute('data-fbu-sidebar'); previous.clear(); oldSidebar = null;
      }
    };
  }
  globalThis.FBUnhookLayout = { create, targets, leftSidebar };
  if (typeof module !== 'undefined') module.exports = globalThis.FBUnhookLayout;
})();
