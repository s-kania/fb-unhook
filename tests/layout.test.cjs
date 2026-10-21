const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const C = require('../extension/core.js');
globalThis.FBUnhook = C;
const L = require('../extension/layout.js');
function fixture() {
  return new JSDOM(`<nav role="navigation" aria-label="Facebook"><ul><li id="home"><a href="/">Home</a></li><li id="reels-nav"><a href="/reel/">Reels</a></li><li id="friends"><a href="/friends/">Friends</a></li><li id="market"><a href="/marketplace/">Marketplace</a></li></ul></nav>
  <nav role="navigation" aria-label="Mechanizmy kontrolne i ustawienia konta"><button id="account">Account</button></nav>
  <nav role="navigation" aria-label="Skróty" id="sidebar"><h2>Menu Facebooka</h2><div><ul id="menu"><li>Menu</li></ul><div id="short-title"><h3>Twoje skróty</h3></div><ul id="short-list"><li><a href="/groups/123/">Group</a></li></ul><button id="short-more">Wyświetl więcej skrótów</button><footer id="footer">Privacy</footer></div></nav>
  <main role="main"><div role="region" aria-label="Relacje" id="stories"><h3>Relacje</h3></div><div role="feed"><div id="shared"><div data-pagelet="FeedUnit_0" id="reels"><h3>Rolki</h3><a href="/reel/123/">Watch</a></div><div data-pagelet="FeedUnit_1" id="post"><h4><a href="/groups/123/">Group</a></h4><div data-ad-preview="message"><h3>Stories</h3><a href="/reel/234/">2 days ago</a></div></div><div id="loader">Loading</div></div></div></main>`, { url: 'https://www.facebook.com/' }).window.document;
}
test('simplifies only primary navigation and preserves account controls', () => {
  const doc = fixture(); L.create(doc).apply(C.DEFAULTS);
  for (const id of ['friends', 'reels-nav']) assert.ok(doc.getElementById(id).hasAttribute('data-fbu-ui-hidden'));
  for (const id of ['home', 'market', 'account']) assert.equal(doc.getElementById(id).closest('[data-fbu-ui-hidden]'), null);
});
test('stories and reels are hidden without hiding ordinary posts or pagination', () => {
  const doc = fixture(); L.create(doc).apply(C.DEFAULTS);
  for (const id of ['stories', 'reels']) assert.ok(doc.getElementById(id).hasAttribute('data-fbu-ui-hidden'));
  for (const id of ['post', 'loader', 'shared']) assert.equal(doc.getElementById(id).closest('[data-fbu-ui-hidden]'), null);
});
test('shortcuts can be hidden independently while retaining the menu and footer', () => {
  const doc = fixture(); L.create(doc).apply({ ...C.DEFAULTS, hideSidebar: false });
  assert.equal(doc.getElementById('sidebar').hasAttribute('data-fbu-sidebar'), false);
  for (const id of ['short-title', 'short-list', 'short-more']) assert.ok(doc.getElementById(id).hasAttribute('data-fbu-ui-hidden'));
  for (const id of ['menu', 'footer']) assert.equal(doc.getElementById(id).closest('[data-fbu-ui-hidden]'), null);
});
test('disabling extension restores every original UI element', () => {
  const doc = fixture(), layout = L.create(doc); layout.apply(C.DEFAULTS);
  assert.ok(doc.getElementById('sidebar').hasAttribute('data-fbu-sidebar'));
  layout.apply({ ...C.DEFAULTS, enabled: false });
  assert.equal(doc.querySelectorAll('[data-fbu-ui-hidden],[data-fbu-sidebar]').length, 0);
});
test('feature toggles and dynamically appended reels are reapplied independently', () => {
  const doc = fixture(), layout = L.create(doc);
  layout.apply({ ...C.DEFAULTS, hideStories: false, hideReels: false, minimalNavigation: false });
  assert.equal(doc.getElementById('stories').hasAttribute('data-fbu-ui-hidden'), false);
  assert.equal(doc.getElementById('reels').hasAttribute('data-fbu-ui-hidden'), false);
  const next = doc.createElement('div'); next.dataset.pagelet = 'FeedUnit_2'; next.innerHTML = '<h3>Reels</h3>';
  doc.getElementById('shared').append(next); layout.apply(C.DEFAULTS);
  assert.equal(next.getAttribute('data-fbu-ui-hidden'), 'true');
  layout.clear(); assert.equal(doc.querySelectorAll('[data-fbu-ui-hidden],[data-fbu-sidebar]').length, 0);
});

test('contacts include their controls and list, but not adjacent sections or post headings', () => {
  const doc = fixture(), layout = L.create(doc);
  doc.body.insertAdjacentHTML('beforeend', `<aside role="complementary"><div data-pagelet="RightRail"><section id="other"><h3>Sponsored</h3></section><section id="contacts"><div><h3>Kontakty</h3><button>Search</button><button>Options</button></div><button id="expand">Show all</button><ul id="people"><li>Contact</li></ul></section></div></aside><div role="button" aria-label="Nowa wiadomość" id="compose"></div><div role="dialog"><button aria-label="New message" id="dialog-compose"></button></div>`);
  doc.getElementById('post').insertAdjacentHTML('beforeend', '<h3 id="post-contacts">Contacts</h3>');
  layout.apply(C.DEFAULTS);
  for (const id of ['contacts', 'expand', 'people', 'compose']) assert.ok(doc.getElementById(id).closest('[data-fbu-ui-hidden]'));
  for (const id of ['other', 'post-contacts', 'dialog-compose']) assert.equal(doc.getElementById(id).closest('[data-fbu-ui-hidden]'), null);
  layout.apply({ ...C.DEFAULTS, hideContacts: false });
  assert.equal(doc.getElementById('contacts').closest('[data-fbu-ui-hidden]'), null);
  assert.ok(doc.getElementById('compose').closest('[data-fbu-ui-hidden]'));
  layout.apply({ ...C.DEFAULTS, hideMessageButton: false });
  assert.ok(doc.getElementById('contacts').closest('[data-fbu-ui-hidden]'));
  assert.equal(doc.getElementById('compose').closest('[data-fbu-ui-hidden]'), null);
  doc.getElementById('contacts').querySelector('h3').textContent = 'Contacts';
  doc.getElementById('compose').setAttribute('aria-label', 'New message');
  layout.apply(C.DEFAULTS);
  assert.ok(doc.getElementById('contacts').closest('[data-fbu-ui-hidden]'));
  assert.ok(doc.getElementById('compose').closest('[data-fbu-ui-hidden]'));
  layout.apply({ ...C.DEFAULTS, enabled: false });
  assert.equal(doc.querySelectorAll('[data-fbu-ui-hidden],[data-fbu-sidebar]').length, 0);
});
test('composer bar is hidden only in feeds and is restored by its toggle', () => {
  const doc = fixture(), layout = L.create(doc);
  doc.querySelector('main').insertAdjacentHTML('afterbegin', '<div id="composer" role="region" aria-label="Utwórz post"><button>O czym myślisz?</button></div><div role="dialog"><div id="compose-dialog" role="region" aria-label="Utwórz post"></div></div>');
  layout.apply(C.DEFAULTS);
  assert.ok(doc.getElementById('composer').hasAttribute('data-fbu-ui-hidden'));
  assert.equal(doc.getElementById('compose-dialog').hasAttribute('data-fbu-ui-hidden'), false);
  layout.apply({ ...C.DEFAULTS, hideComposer: false });
  assert.equal(doc.getElementById('composer').hasAttribute('data-fbu-ui-hidden'), false);
  doc.defaultView.history.pushState({}, '', '/groups/123/'); layout.apply(C.DEFAULTS);
  assert.equal(doc.getElementById('composer').hasAttribute('data-fbu-ui-hidden'), false);
});
test('expanded contacts with name headings and separate group chats disappear completely', () => {
  const doc = fixture(), layout = L.create(doc);
  doc.body.insertAdjacentHTML('beforeend', '<aside role="complementary"><div data-pagelet="RightRail"><div id="ad"><h3>Sponsored</h3></div><div id="expanded"><header><h3>Kontakty</h3><button>Options</button></header><ul id="people"><li><a href="/messages/t/123"><h3>Person name</h3></a></li></ul></div><div id="chats"><h3>Czaty grupowe</h3><ul><li><button>Chat</button></li></ul></div></div></aside>');
  layout.apply(C.DEFAULTS);
  for (const id of ['expanded', 'people', 'chats']) assert.ok(doc.getElementById(id).closest('[data-fbu-ui-hidden]'));
  assert.equal(doc.getElementById('ad').closest('[data-fbu-ui-hidden]'), null);
  doc.getElementById('expanded').querySelector('header').remove(); layout.apply(C.DEFAULTS);
  assert.ok(doc.getElementById('people').closest('[data-fbu-ui-hidden]'));
  layout.apply({ ...C.DEFAULTS, hideContacts: false });
  for (const id of ['expanded', 'people', 'chats']) assert.equal(doc.getElementById(id).closest('[data-fbu-ui-hidden]'), null);
});
