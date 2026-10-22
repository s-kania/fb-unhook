const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const C = require('../extension/core.js');
const read = name => fs.readFileSync(require.resolve('../extension/' + name), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('fresh-install instructions start a sync without changing preferences and disappear after success', async () => {
  const dom = new JSDOM(read('popup.html'), { url: 'https://extension.test/popup.html', runScripts: 'outside-only' });
  const w = dom.window, sent = [];
  let change;
  const state = structuredClone(C.DEFAULTS);
  w.chrome = {
    runtime: { getManifest: () => ({ version: '0.7.2' }), sendMessage: async m => { sent.push(m); return { ok: true }; } },
    storage: { local: { get: async () => structuredClone(state) }, onChanged: { addListener: f => { change = f; } } },
    tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ route: 'feed', shown: 0, hidden: 0 }) }
  };
  try {
    w.eval(read('i18n.js')); w.eval(read('core.js')); w.eval(read('popup.js')); await settle();
    assert.equal(w.document.querySelector('#setup').hidden, false);
    assert.equal(w.document.querySelector('#version').textContent, '0.7.2');
    w.document.querySelector('#setup-sync').click(); await settle();
    assert.deepEqual(JSON.parse(JSON.stringify(sent)), [{ type: 'begin-sync' }]);
    state.sync = { status: 'running', count: 0, total: 1 }; change(); await settle();
    assert.equal(w.document.querySelector('#setup-sync').disabled, true);
    w.document.querySelector('#setup-sync').click(); await settle();
    assert.equal(sent.length, 1);
    state.groups = [{ id: '123', name: 'Synthetic group' }];
    state.lastSync = Date.now(); state.sync.status = 'complete'; change(); await settle();
    assert.equal(w.document.querySelector('#setup').hidden, true);
    assert.equal(w.document.querySelector('#groups').children.length, 1);
    assert.equal(w.document.querySelector('footer a').getAttribute('href'), 'privacy-en.html');
  } finally { w.close(); }
});

test('successful empty membership list is not treated as unfinished setup', async () => {
  const dom = new JSDOM(read('popup.html'), { url: 'https://extension.test/popup.html', runScripts: 'outside-only' });
  const w = dom.window;
  w.chrome = {
    runtime: { getManifest: () => ({ version: '0.7.2' }) },
    storage: { local: { get: async () => ({ ...C.DEFAULTS, lastSync: Date.now(), groups: [] }) }, onChanged: { addListener() {} } },
    tabs: { query: async () => [] }
  };
  try {
    w.eval(read('i18n.js')); w.eval(read('core.js')); w.eval(read('popup.js')); await settle();
    assert.equal(w.document.querySelector('#setup').hidden, true);
    assert.equal(w.document.querySelector('#error').hidden, true);
  } finally { w.close(); }
});

test('globe language selector changes all popup labels, persists on reopen and preserves controls and user input', async () => {
  const state = { ...structuredClone(C.DEFAULTS), groups: [{ id: '123', name: '<b>Example</b>' }], disabledGroups: ['123'], lastSync: 1234 };
  const open = () => {
    const dom = new JSDOM(read('popup.html'), { url: 'https://extension.test/popup.html', runScripts: 'outside-only' });
    const w = dom.window;
    w.chrome = {
      i18n: { getUILanguage: () => 'pl-PL' },
      runtime: { getManifest: () => ({ version: '0.7.2' }), sendMessage: async m => { if (m.type === 'settings') state.language = m.language; return { ok: true }; } },
      storage: { local: { get: async () => structuredClone(state) }, onChanged: { addListener() {} } },
      tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ route: 'feed', shown: 2, hidden: 8 }) }
    };
    for (const file of ['i18n.js', 'core.js', 'popup.js']) w.eval(read(file));
    return dom;
  };
  let dom = open();
  try {
    await settle();
    let d = dom.window.document;
    assert.equal(d.documentElement.lang, 'pl');
    d.querySelector('#language-button').click();
    assert.equal(d.querySelector('#language-menu').hidden, false);
    d.querySelector('#search').value = 'Example';
    d.querySelector('#url').value = 'https://www.facebook.com/groups/456/';
    d.querySelector('#language').value = 'en';
    d.querySelector('#language').dispatchEvent(new dom.window.Event('change')); await settle();
    assert.equal(state.language, 'en');
    assert.equal(d.documentElement.lang, 'en');
    assert.equal(d.querySelector('[data-i18n=hideContacts]').textContent, 'Hide contacts');
    assert.equal(d.querySelector('#status').textContent, 'Posts on this page: 2 visible · 8 hidden.');
    assert.equal(d.querySelector('#groups input').checked, false);
    assert.equal(d.querySelector('#groups a').textContent, '<b>Example</b>');
    assert.equal(d.querySelector('#groups b'), null);
    assert.equal(d.querySelector('#url').value, 'https://www.facebook.com/groups/456/');
    assert.equal(d.querySelector('#search').value, 'Example');
    assert.equal(d.querySelector('footer a').getAttribute('href'), 'privacy-en.html');
    d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(d.querySelector('#language-menu').hidden, true);
    assert.equal(d.activeElement.id, 'language-button');
    dom.window.close(); dom = open(); await settle(); d = dom.window.document;
    assert.equal(d.documentElement.lang, 'en');
    assert.equal(d.querySelector('#language').value, 'en');
    d.querySelector('#language').value = 'auto';
    d.querySelector('#language').dispatchEvent(new dom.window.Event('change')); await settle();
    assert.equal(d.documentElement.lang, 'pl');
    assert.equal(d.querySelector('footer a').getAttribute('href'), 'privacy.html');
    assert.equal(state.groups.length, 1); assert.equal(state.disabledGroups[0], '123');
  } finally { dom.window.close(); }
});
