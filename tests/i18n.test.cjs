const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const I = require('../extension/i18n.js');

test('automatic language follows browser UI with English fallback; manual choice wins', () => {
  for (const locale of ['pl', 'pl-PL', 'PL-pl']) assert.equal(I.resolve('auto', locale), 'pl');
  for (const locale of ['en', 'en-GB', 'de-DE', 'fr', '', 'plant']) assert.equal(I.resolve('auto', locale), 'en');
  assert.equal(I.resolve('en', 'pl-PL'), 'en');
  assert.equal(I.resolve('pl', 'en-US'), 'pl');
  assert.equal(I.resolve('unknown', 'pl-PL'), 'pl');
});

test('both dictionaries cover every UI key with matching interpolation fields', () => {
  assert.deepEqual(Object.keys(I.messages.en).sort(), Object.keys(I.messages.pl).sort());
  for (const key of Object.keys(I.messages.en)) {
    const fields = lang => [...I.messages[lang][key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(fields('en'), fields('pl'), key);
  }
  const html = fs.readFileSync(require.resolve('../extension/popup.html'), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n(?:-title|-aria-label|-placeholder)?="([^"]+)"/g)) assert.ok(I.messages.en[key], key);
  for (const file of ['popup', 'content', 'post-controls', 'loading', 'background']) {
    const source = fs.readFileSync(require.resolve(`../extension/${file}.js`), 'utf8');
    for (const [, key] of source.matchAll(/(?:\bt|failure)\('([^']+)'/g)) assert.ok(I.messages.en[key], `${file}: ${key}`);
  }
});

test('browser UI locale takes precedence over page language and translations treat group names as text', () => {
  const dom = new JSDOM('<html lang="pl"><body><p data-i18n="group"></p></body></html>', { runScripts: 'outside-only' });
  try {
    dom.window.chrome = { i18n: { getUILanguage: () => 'en-GB' } };
    dom.window.eval(fs.readFileSync(require.resolve('../extension/i18n.js'), 'utf8'));
    const api = dom.window.FBUnhookI18n;
    api.translate(dom.window.document);
    assert.equal(dom.window.document.documentElement.lang, 'en');
    assert.equal(dom.window.document.querySelector('p').textContent, 'Group');
    api.setLanguage('pl'); api.translate(dom.window.document);
    assert.equal(dom.window.document.querySelector('p').textContent, 'Grupa');
    assert.equal(api.t('showGroup', { name: '<img src=x>' }), 'Pokaż posty z grupy <img src=x>');
    assert.equal(dom.window.document.querySelector('img'), null);
  } finally { dom.window.close(); }
});
