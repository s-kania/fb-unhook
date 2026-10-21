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
    runtime: { getManifest: () => ({ version: '0.7.1' }), sendMessage: async m => { sent.push(m); return { ok: true }; } },
    storage: { local: { get: async () => structuredClone(state) }, onChanged: { addListener: f => { change = f; } } },
    tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ route: 'feed', shown: 0, hidden: 0 }) }
  };
  try {
    w.eval(read('core.js')); w.eval(read('popup.js')); await settle();
    assert.equal(w.document.querySelector('#setup').hidden, false);
    assert.equal(w.document.querySelector('#version').textContent, '0.7.1');
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
    assert.equal(w.document.querySelector('footer a').getAttribute('href'), 'privacy.html');
  } finally { w.close(); }
});

test('successful empty membership list is not treated as unfinished setup', async () => {
  const dom = new JSDOM(read('popup.html'), { url: 'https://extension.test/popup.html', runScripts: 'outside-only' });
  const w = dom.window;
  w.chrome = {
    runtime: { getManifest: () => ({ version: '0.7.1' }) },
    storage: { local: { get: async () => ({ ...C.DEFAULTS, lastSync: Date.now(), groups: [] }) }, onChanged: { addListener() {} } },
    tabs: { query: async () => [] }
  };
  try {
    w.eval(read('core.js')); w.eval(read('popup.js')); await settle();
    assert.equal(w.document.querySelector('#setup').hidden, true);
    assert.equal(w.document.querySelector('#error').hidden, true);
  } finally { w.close(); }
});
