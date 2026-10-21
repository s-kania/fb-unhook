const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const delay = () => new Promise(resolve => setTimeout(resolve, 180));
test('live filtering handles newly loaded posts, recycled DOM, toggles and SPA routes', async () => {
  const dom = new JSDOM('<main role="main"><div role="feed"><div id="known"><div data-pagelet="FeedUnit_0"><h4><a href="/groups/123/">Known</a></h4></div></div><div id="personal"><div data-pagelet="FeedUnit_1"><h4><a href="/person">Person</a></h4></div></div></div></main>', { url: 'https://www.facebook.com/', runScripts: 'outside-only' });
  const w = dom.window;
  let storageChanged;
  w.chrome = { runtime: { id: 'test', sendMessage: async () => ({ tabId: 1 }), onMessage: { addListener() {} } }, storage: { local: { get: async () => ({ groups: [{ id: '123', name: 'Known' }] }) }, onChanged: { addListener: fn => { storageChanged = fn; } } } };
  try {
    w.eval(fs.readFileSync(require.resolve('../extension/core.js'), 'utf8'));
    w.eval(fs.readFileSync(require.resolve('../extension/layout.js'), 'utf8'));
    w.eval(fs.readFileSync(require.resolve('../extension/post-controls.js'), 'utf8'));
    w.eval(fs.readFileSync(require.resolve('../extension/loading.js'), 'utf8'));
    w.eval(fs.readFileSync(require.resolve('../extension/content.js'), 'utf8'));
    await delay();
    const hidden = id => w.document.getElementById(id).querySelector('[data-pagelet]').getAttribute('data-fbu-hidden');
    assert.equal(hidden('known'), null); assert.equal(hidden('personal'), 'true');
    const next = w.document.createElement('div'); next.id = 'next'; next.innerHTML = '<div data-pagelet="FeedUnit_2"><h4><a href="/groups/999/">Other group</a></h4></div>';
    w.document.querySelector('[role=feed]').append(next); await delay(); assert.equal(hidden('next'), 'true');
    next.querySelector('a').href = '/groups/123/'; await delay(); assert.equal(hidden('next'), null);
    storageChanged({ enabled: { newValue: false } }, 'local'); await delay(); assert.equal(hidden('personal'), null);
    storageChanged({ enabled: { newValue: true } }, 'local'); await delay(); assert.equal(hidden('personal'), 'true');
    w.history.pushState({}, '', '/groups/123/');
    w.document.body.append(w.document.createElement('span')); await delay(); assert.equal(hidden('personal'), null);
  } finally { w.close(); }
});
test('startup and newly inserted posts stay invisible until classified, and group switches target all matching posts', async () => {
  const css = fs.readFileSync(require.resolve('../extension/content.css'), 'utf8');
  const html = `<style>${css}</style><main role="main"><div role="feed"><div data-pagelet="FeedUnit_0" id="first"><div><h4><a href="/groups/123/">Group</a></h4><div><a aria-label="Ukryj post autora">X</a></div></div></div><div data-pagelet="FeedUnit_1" id="second"><h4><a href="/groups/123/">Group</a></h4></div></div></main>`;
  const dom = new JSDOM(html, { url: 'https://www.facebook.com/', runScripts: 'outside-only' });
  const w = dom.window; let releaseStorage, storageChanged; const sent = [];
  const shadows = new Map(), attach = w.Element.prototype.attachShadow;
  w.Element.prototype.attachShadow = function(options) { const shadow = attach.call(this, options); shadows.set(this, shadow); return shadow; };
  w.chrome = { runtime: { id: 'test', onMessage: { addListener() {} }, sendMessage: async message => { sent.push(message); return { tabId: 1, ok: true }; } }, storage: { local: { get: () => new Promise(resolve => { releaseStorage = resolve; }) }, onChanged: { addListener: fn => { storageChanged = fn; } } } };
  try {
    for (const file of ['core', 'layout', 'post-controls', 'loading', 'content']) w.eval(fs.readFileSync(require.resolve(`../extension/${file}.js`), 'utf8'));
    const first = w.document.getElementById('first');
    assert.equal(w.getComputedStyle(first).visibility, 'hidden');
    releaseStorage({ groups: [{ id: '123', name: 'Group' }] }); await delay();
    assert.equal(w.getComputedStyle(first).visibility, 'visible');
    const host = first.querySelector('[data-fbu-control]'); assert.ok(host);
    const button = shadows.get(host).querySelector('button');
    assert.equal(button.getAttribute('role'), 'switch'); button.click(); await Promise.resolve();
    assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1))), { type: 'group-visibility', id: '123', visible: false });
    storageChanged({ disabledGroups: { newValue: ['123'] } }, 'local'); await delay();
    for (const id of ['first', 'second']) assert.equal(w.getComputedStyle(w.document.getElementById(id)).display, 'none');
    storageChanged({ disabledGroups: { newValue: [] } }, 'local'); await delay();
    assert.notEqual(w.getComputedStyle(first).display, 'none');
    const other = w.document.createElement('div'); other.dataset.pagelet = 'FeedUnit_2'; other.innerHTML = '<h4><a href="/person">Not a group</a></h4>';
    w.document.querySelector('[role=feed]').append(other);
    assert.equal(w.getComputedStyle(other).visibility, 'hidden');
    await delay(); assert.equal(w.getComputedStyle(other).display, 'none');
    first.querySelector('h4 a').href = '/person'; await Promise.resolve();
    assert.equal(w.getComputedStyle(first).display, 'none');
    storageChanged({ enabled: { newValue: false } }, 'local'); await delay();
    assert.notEqual(w.getComputedStyle(other).display, 'none');
    assert.equal(w.getComputedStyle(other).visibility, 'visible');
    assert.equal(w.document.querySelector('[data-fbu-control]'), null);
  } finally { w.close(); }
});

test('post-derived aliases reveal already loaded numeric posts after storage update without navigation', async () => {
  const dom = new JSDOM('<main role="main"><div role="feed"><div data-pagelet="FeedUnit_0" id="numeric"><h4><a href="/groups/123/">Group</a></h4></div></div></main>', { url: 'https://www.facebook.com/', runScripts: 'outside-only' });
  const w = dom.window, sent = []; let storageChanged;
  w.chrome = { runtime: { id: 'test', onMessage: { addListener() {} }, sendMessage: async message => { sent.push(message); return { tabId: 1, ok: true }; } }, storage: { local: { get: async () => ({ groups: [{ id: 'my-group', name: 'Group' }] }) }, onChanged: { addListener: fn => { storageChanged = fn; } } } };
  try {
    for (const file of ['core', 'layout', 'post-controls', 'loading', 'content']) w.eval(fs.readFileSync(require.resolve(`../extension/${file}.js`), 'utf8'));
    await delay();
    const numeric = w.document.getElementById('numeric');
    assert.equal(numeric.getAttribute('data-fbu-hidden'), 'true');
    const source = w.document.createElement('div'); source.dataset.pagelet = 'FeedUnit_1';
    source.innerHTML = '<header><h4><a href="/groups/my-group/">Group</a></h4><a href="/groups/123/user/1/">Author</a></header>';
    w.document.querySelector('[role=feed]').append(source); await delay();
    const messages = sent.filter(m => m.type === 'post-group-alias');
    assert.deepEqual(JSON.parse(JSON.stringify(messages)), [{ type: 'post-group-alias', id: 'my-group', alias: '123' }]);
    storageChanged({ groups: { newValue: [{ id: 'my-group', name: 'Group', aliases: ['123'] }] } }, 'local'); await delay();
    assert.equal(numeric.hasAttribute('data-fbu-hidden'), false);
    assert.equal(w.location.pathname, '/');
  } finally { w.close(); }
});

test('sync obtains fresh numeric IDs from page data matched against Your groups list', async () => {
  const dom = new JSDOM('<main role="main"><h2>Wszystkie grupy, do których należysz (1)</h2><div role="list"><a href="/groups/brand-new/">New group</a></div></main>', { url: 'https://www.facebook.com/groups/joins/', runScripts: 'outside-only' });
  const w = dom.window, sent = [];
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.chrome = { runtime: { id: 'test', onMessage: { addListener() {} }, sendMessage: async message => { sent.push(message); return { tabId: 1, ok: true }; } }, storage: { local: { get: async () => ({ groups: [], sync: { tabId: 1, startedAt: 123, status: 'running' } }) }, onChanged: { addListener() {} } } };
  try {
    for (const file of ['core', 'layout', 'post-controls', 'loading', 'content']) w.eval(fs.readFileSync(require.resolve(`../extension/${file}.js`), 'utf8'));
    const data = { type: 'facebook-unhook:joined-data:v1', groups: [{ id: '987', url: 'https://www.facebook.com/groups/brand-new/' }] };
    w.dispatchEvent(new w.MessageEvent('message', { source: w, origin: 'https://evil.test', data }));
    await delay();
    assert.equal(sent.some(m=>m.complete), false);
    w.dispatchEvent(new w.MessageEvent('message', { source: w, origin: w.location.origin, data }));
    await new Promise(resolve=>setTimeout(resolve, 750));
    const complete = sent.find(m=>m.complete);
    assert.ok(complete);
    assert.equal(complete.groups[0].id, '987');
    assert.equal(complete.groups[0].aliases[0], 'brand-new');
    assert.equal(complete.startedAt, 123);
  } finally { w.close(); }
});
