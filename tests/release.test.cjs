const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('store manifest resolves English fallback metadata and references only packaged resources', () => {
  const m = JSON.parse(read('extension/manifest.json'));
  assert.equal(m.version, JSON.parse(read('package.json')).version);
  assert.equal(m.default_locale, 'en');
  const messages = JSON.parse(read('extension/_locales/en/messages.json'));
  for (const field of ['name', 'description']) {
    const key = m[field].match(/^__MSG_(.+)__$/)[1];
    assert.ok(messages[key]?.message.length > 0);
  }
  assert.ok(messages.extensionDescription.message.length <= 132);
  assert.deepEqual(m.permissions, ['storage']);
  const files = [m.background.service_worker, m.action.default_popup, ...Object.values(m.icons), ...m.content_scripts.flatMap(c => [...c.js, ...(c.css || [])])];
  for (const file of files) assert.ok(fs.existsSync(path.join(root, 'extension', file)), file);
  for (const name of ['popup.html', 'privacy.html', 'privacy-en.html']) {
    const dom = new JSDOM(read('extension/' + name));
    try {
      for (const node of dom.window.document.querySelectorAll('script,link[rel=stylesheet],img')) {
        const source = node.getAttribute('src') || node.getAttribute('href');
        assert.ok(source && !/^(https?:|\/\/|data:)/.test(source), 'No inline or remote executable resources');
        assert.ok(fs.existsSync(path.join(root, 'extension', source)), source);
      }
    } finally { dom.window.close(); }
  }
});

test('public privacy copy matches bundled policy without trackers and with the authorized support contact', () => {
  for (const file of ['privacy.html', 'privacy-en.html', 'privacy.css']) assert.equal(read('store/site/' + file), read('extension/' + file));
  assert.match(read('extension/privacy.html'), /mailto:jsnetic@outlook\.com/);
  assert.doesNotMatch(read('extension/privacy.html'), /<script|@gmail\.com/i);
});
