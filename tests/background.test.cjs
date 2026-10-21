const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../extension/core.js');
function worker(initial = {}) {
  let listener;
  const data = structuredClone(initial);
  const opened = [], navigated = [];
  const chrome = { runtime: { getURL: path => 'chrome-extension://test/' + path, onMessage: { addListener: fn => { listener = fn; } } }, storage: { local: { get: async () => structuredClone(data), set: async patch => Object.assign(data, structuredClone(patch)) } }, tabs: { create: async args => { opened.push(args); return { id: 7 }; }, update: async (...args) => { navigated.push(args); }, remove: async () => {}, onRemoved: { addListener() {} } } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'), 'utf8'), { chrome, URL, FBUnhook: C, importScripts() {}, console, setTimeout: () => 1, clearTimeout() {} });
  return { data, opened, navigated, send: (message, sender = { url: 'chrome-extension://test/popup.html' }) => new Promise(resolve => listener(message, sender, resolve)) };
}
test('partial synchronization preserves previous memberships', async () => {
  const w = worker({ groups: [{ id: 'old', name: 'Old' }], sync: { tabId: 7, status: 'running' } });
  await w.send({ type: 'sync-result', groups: [{ id: 'new', name: 'New' }], total: 2, done: true, complete: false }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
  assert.equal(w.data.groups[0].id, 'old'); assert.equal(w.data.sync.status, 'partial');
});
test('complete synchronization replaces obsolete memberships', async () => {
  const w = worker({ groups: [{ id: 'old', name: 'Old' }], sync: { tabId: 7, status: 'running' } });
  await w.send({ type: 'sync-result', groups: [{ id: '123', name: 'New' }], total: 1, complete: true }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
  assert.equal(w.data.groups[0].id, '123'); assert.equal(w.data.sync.status, 'complete'); assert.ok(w.data.lastSync);
});
test('forged completion count does not replace memberships', async () => {
  const w = worker({ groups: [{ id: 'old', name: 'Old' }], sync: { tabId: 7, status: 'running' } });
  await w.send({ type: 'sync-result', groups: [], total: 78, complete: true, done: true }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
  assert.equal(w.data.groups[0].id, 'old'); assert.equal(w.data.sync.status, 'partial');
});
test('only the designated synchronization tab can change memberships', async () => {
  const w = worker({ groups: [], sync: { tabId: 7, status: 'running' } });
  await w.send({ type: 'sync-result', groups: [{ id: '123', name: 'Group' }], total: 1, complete: true }, { tab: { id: 8 } });
  assert.equal(w.data.groups.length, 0);
});
test('Facebook content scripts cannot send popup settings commands', async () => {
  const w = worker({ enabled: true });
  const result = await w.send({ type: 'settings', enabled: false }, { tab: { id: 7 }, url: 'https://www.facebook.com/' });
  assert.ok(result.error); assert.equal(w.data.enabled, true);
});
test('serialized manual edits do not lose groups', async () => {
  const w = worker({ groups: [] });
  await Promise.all([w.send({ type: 'add-group', url: 'https://www.facebook.com/groups/123/' }), w.send({ type: 'add-group', url: 'https://www.facebook.com/groups/456/' })]);
  assert.equal(w.data.groups.length, 2);
});
test('sync opens only Your groups and never navigates individual groups; existing aliases survive', async () => {
  const w = worker({ groups: [{ id: 'my-group', name: 'Old', aliases: ['123'] }], resolver: { tabId: 9, pending: ['old'] } });
  await w.send({ type: 'begin-sync' });
  await w.send({ type: 'sync-result', groups: [{ id: '123', name: 'Group', aliases: ['my-group'] }, { id: '456', name: 'Other', aliases: ['another-group'] }], total: 2, complete: true, startedAt: w.data.sync.startedAt }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
  assert.equal(w.opened.length, 1);
  assert.equal(new URL(w.opened[0].url).pathname, '/groups/joins/');
  assert.equal(w.navigated.length, 0);
  assert.equal(w.data.resolver, null);
  assert.deepEqual(w.data.groups[0].aliases, ['my-group']);
  assert.equal(w.data.sync.status, 'complete');
});
test('passive aliases preserve membership counts and disabled choices and reject conflicts and foreign senders', async () => {
  const w = worker({ groups: [{ id: 'my-group', name: 'Group' }, { id: '456', name: 'Other' }], disabledGroups: ['my-group'] });
  const sender = { tab: { id: 8 }, url: 'https://www.facebook.com/' };
  const message = { type: 'post-group-alias', id: 'my-group', alias: '123' };
  assert.ok((await w.send(message, { ...sender, url: 'https://evil.test/' })).error);
  assert.ok((await w.send(message, { ...sender, url: 'https://www.facebook.com/groups/my-group/' })).error);
  assert.ok((await w.send({ ...message, alias: '456' }, sender)).error);
  assert.ok((await w.send({ ...message, id: 'unknown' }, sender)).error);
  assert.ok((await w.send({ ...message, alias: '../123' }, sender)).error);
  assert.equal((await w.send(message, sender)).ok, true);
  await w.send(message, sender);
  assert.equal(w.data.groups.length, 2);
  assert.deepEqual(w.data.groups[0].aliases, ['123']);
  assert.deepEqual(w.data.disabledGroups, ['my-group', '123']);
  assert.equal(w.opened.length, 0);
});
test('group visibility persists through membership refresh, handles aliases and rejects foreign senders', async () => {
  const w = worker({ groups: [{ id: '123', name: 'Group', aliases: ['named-group'] }], sync: { tabId: 7, status: 'running' } });
  await w.send({ type: 'group-visibility', id: '123', visible: false }, { tab: { id: 8 }, url: 'https://www.facebook.com/' });
  assert.deepEqual(w.data.disabledGroups, ['123', 'named-group']);
  await w.send({ type: 'sync-result', groups: [{ id: '123', name: 'Group' }], total: 1, complete: true }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
  assert.equal(C.groupEnabled(w.data.groups[0], w.data.disabledGroups), false);
  const denied = await w.send({ type: 'group-visibility', id: '123', visible: true }, { tab: { id: 8 }, url: 'https://example.com/' });
  assert.ok(denied.error); assert.equal(C.groupEnabled(w.data.groups[0], w.data.disabledGroups), false);
  await w.send({ type: 'group-visibility', id: '123', visible: true });
  assert.equal(C.groupEnabled(w.data.groups[0], w.data.disabledGroups), true);
  assert.deepEqual(w.data.disabledGroups, []);
  const missing = await w.send({ type: 'group-visibility', id: '999', visible: false }); assert.ok(missing.error);
});

test('fresh list supplies numeric IDs without any previous aliases and preserves disabled vanity groups', async () => {
  const w = worker({ groups: [{ id: 'vanity', name: 'Old' }], disabledGroups: ['vanity'], sync: { tabId: 7, status: 'running', startedAt: 123 } });
  const message = { type: 'sync-result', groups: [{ id: '987', name: 'Group', aliases: ['vanity'] }, { id: '654', name: 'New', aliases: ['new-group'] }], total: 2, complete: true, startedAt: 123 };
  const sender = { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' };
  await w.send({ ...message, startedAt: 122 }, sender);
  assert.equal(w.data.groups[0].id, 'vanity');
  await w.send(message, sender);
  assert.deepEqual(w.data.groups.map(g => g.id), ['987', '654']);
  assert.equal(C.groupEnabled(w.data.groups[0], w.data.disabledGroups), false);
  assert.ok(w.data.disabledGroups.includes('987'));
  assert.equal(w.opened.length, 0);
});
test('missing numeric IDs, duplicate IDs and conflicting aliases cannot replace a complete list', async () => {
  for (const groups of [
    [{ id: 'vanity', name: 'Group' }],
    [{ id: '123', name: 'A' }, { id: '123', name: 'B' }],
    [{ id: '123', name: 'A', aliases: ['same'] }, { id: '456', name: 'B', aliases: ['same'] }]
  ]) {
    const w = worker({ groups: [{ id: 'old', name: 'Old' }], sync: { tabId: 7, status: 'running' } });
    await w.send({ type: 'sync-result', groups, total: groups.length, complete: true, done: true }, { tab: { id: 7 }, url: 'https://www.facebook.com/groups/joins/' });
    assert.equal(w.data.groups[0].id, 'old'); assert.equal(w.data.sync.status, 'partial');
  }
});
