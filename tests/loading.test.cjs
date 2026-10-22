const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
globalThis.FBUnhookI18n = require('../extension/i18n.js');
globalThis.FBUnhookI18n.setLanguage('pl');
const L = require('../extension/loading.js');
function fixture() {
  const dom = new JSDOM('<main role="main"><div role="feed"><div data-pagelet="FeedUnit_0" id="post"><h4>Post</h4><span role="status" aria-label="Ładowanie…"></span></div><div id="placeholder" role="status" aria-label="Ładowanie…"></div></div></main>');
  const doc = dom.window.document;
  const placeholder = doc.getElementById('placeholder'), post = doc.getElementById('post');
  placeholder.getBoundingClientRect = () => ({ top: 450, bottom: 750, width: 600, height: 300, left: 300 });
  post.getBoundingClientRect = () => ({ top: 80, bottom: 400, width: 600, height: 320, left: 300 });
  return { dom, doc, placeholder, post };
}
test('loader covers initial waiting and nearby pagination, restores placeholders and never covers completed post content', () => {
  const { dom, doc, placeholder, post } = fixture(); let clock = 0;
  const loader = L.create(doc, () => clock);
  try {
    assert.equal(loader.update({ enabled: true, ready: false, route: 'feed', units: [], shown: 0 }), true);
    assert.equal(doc.getElementById('facebook-unhook-loading').hidden, false);
    assert.equal(post.hasAttribute('data-fbu-loading-placeholder'), false);
    assert.equal(placeholder.getAttribute('data-fbu-loading-placeholder'), 'true');
    assert.equal(loader.update({ enabled: true, ready: true, route: 'feed', units: [post], shown: 1 }), true);
    clock = 21000;
    assert.equal(loader.update({ enabled: true, ready: true, route: 'feed', units: [post], shown: 1 }), false);
    assert.equal(doc.getElementById('facebook-unhook-loading').hasAttribute('data-idle'), true);
    placeholder.remove();
    assert.equal(loader.update({ enabled: true, ready: true, route: 'feed', units: [post], shown: 1 }), false);
    assert.equal(doc.getElementById('facebook-unhook-loading').hidden, true);
    assert.equal(placeholder.hasAttribute('data-fbu-loading-placeholder'), false);
    loader.clear(); assert.equal(doc.getElementById('facebook-unhook-loading'), null);
  } finally { dom.window.close(); }
});
test('offscreen pagination, disabled extension, other routes and empty group configuration do not spin', () => {
  const { dom, doc, placeholder, post } = fixture(), loader = L.create(doc);
  const state = { enabled: true, ready: true, route: 'feed', units: [post], shown: 1 };
  try {
    placeholder.getBoundingClientRect = () => ({ top: 4000, bottom: 4300, width: 600, height: 300, left: 300 });
    assert.equal(loader.update(state), false);
    assert.equal(loader.update({ ...state, units: [], shown: 0, configured: false }), false);
    assert.equal(doc.getElementById('facebook-unhook-loading').hasAttribute('data-idle'), true);
    assert.equal(loader.update({ ...state, enabled: false }), false);
    assert.equal(doc.getElementById('facebook-unhook-loading').hidden, true);
    assert.equal(loader.update({ ...state, route: 'other' }), false);
  } finally { dom.window.close(); }
});

test('loading counter advances for filtered posts, ignores empty skeletons and does not recount updates or removed posts', () => {
  const { dom, doc, post } = fixture();
  let shadow;
  const attach = dom.window.Element.prototype.attachShadow;
  dom.window.Element.prototype.attachShadow = function(options) { shadow = attach.call(this, options); return shadow; };
  const loader = L.create(doc);
  const state = { enabled: true, ready: true, route: 'feed', path: '/', shown: 0 };
  const hidden = doc.createElement('div'), pending = doc.createElement('div');
  hidden.innerHTML = '<h4>Filtered post</h4>'; hidden.setAttribute('data-fbu-hidden', 'true');
  try {
    loader.update({ ...state, units: [post] });
    const count = () => shadow.querySelector('.count').textContent;
    assert.equal(count(), '1');
    loader.update({ ...state, units: [post, hidden, pending] });
    assert.equal(count(), '2');
    loader.update({ ...state, units: [hidden, pending] });
    assert.equal(count(), '2');
    pending.innerHTML = '<h4>Newly loaded post</h4>';
    loader.update({ ...state, units: [hidden, pending] });
    assert.equal(count(), '3');
    loader.update({ ...state, path: '/groups/feed/', units: [post] });
    assert.equal(count(), '1');
  } finally { loader.clear(); dom.window.close(); }
});
