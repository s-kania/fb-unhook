const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const D = require('../extension/joined-data.js');
const group = (id, key, state = 'MEMBER') => ({ __typename: 'Group', id, name: 'Synthetic group', url: `https://www.facebook.com/groups/${key}/`, viewer_join_state: state });
const payload = nodes => ({ data: { viewer: { all_joined_groups: { tab_groups_list: { edges: nodes.map(node=>({node})), page_info: { has_next_page: true } } } } } });
const pause = () => new Promise(resolve => setTimeout(resolve, 15));
test('reads initial embedded data and streamed pagination, excludes other group connections and non-members', () => {
  const first = payload([group('123', 'vanity'), group('456', 'pending', 'REQUESTED'), group('bad', 'invalid')]);
  const embedded = { require: [['loader', 0, [], [{ __bbox: { result: first } }]]], recommendations: { tab_groups_list: { edges: [{ node: group('999', 'not-joined') }] } } };
  assert.deepEqual(D.parse(JSON.stringify(embedded)).map(g=>g.id), ['123']);
  const stream = 'for (;;);' + JSON.stringify(first) + '\n' + JSON.stringify(payload([group('789', 'another')])) + '\nnot json';
  assert.deepEqual(D.parse(stream).map(g=>g.id), ['123', '789']);
  assert.deepEqual(D.parse('{"all_joined_groups":'), []);
});
test('null or malformed pagination edges do not discard valid memberships', () => {
  const data = payload([group('123', 'valid')]);
  data.data.viewer.all_joined_groups.tab_groups_list.edges.unshift(null, {}, { node: null });
  assert.deepEqual(D.parse(JSON.stringify(data)).map(g => g.id), ['123']);
});
test('bridge observes initial scripts, fetch and XHR without issuing or changing requests; stops reading outside list', async () => {
  const dom = new JSDOM('<html><head></head><body></body></html>', { url: 'https://www.facebook.com/groups/joins/' });
  const w = dom.window, messages = [], calls = [];
  w.postMessage = message => messages.push(message);
  const script = w.document.createElement('script'); script.type = 'application/json'; script.textContent = JSON.stringify(payload([group('123', 'first')])); w.document.head.append(script);
  let reads = 0;
  const response = { url: 'https://www.facebook.com/api/graphql/', clone() { reads++; return { text: async () => JSON.stringify(payload([group('456', 'next')])) }; } };
  const requestResult = Promise.resolve(response);
  w.fetch = (...args) => { calls.push(args); return requestResult; };
  class XHR extends w.EventTarget { open(...args) { this.args = args; } }
  w.XMLHttpRequest = XHR;
  try {
    D.install(w);
    assert.equal(calls.length, 0);
    assert.deepEqual(messages.at(-1).groups.map(g=>g.id), ['123']);
    const options = { method: 'POST', body: 'existing Facebook request' };
    assert.equal(w.fetch('/api/graphql/', options), requestResult);
    await pause();
    assert.equal(calls.length, 1); assert.equal(calls[0][1], options);
    assert.deepEqual(messages.at(-1).groups.map(g=>g.id), ['123', '456']);
    const xhr = new w.XMLHttpRequest(); xhr.open('POST', '/api/graphql/');
    xhr.responseURL = 'https://www.facebook.com/api/graphql/'; xhr.responseText = JSON.stringify(payload([group('789', 'last')])); xhr.dispatchEvent(new w.Event('load'));
    assert.deepEqual(messages.at(-1).groups.map(g=>g.id), ['123', '456', '789']);
    assert.deepEqual(xhr.args, ['POST', '/api/graphql/']);
    w.history.pushState({}, '', '/');
    w.fetch('/api/graphql/', options); await pause();
    assert.equal(reads, 1);
  } finally { w.close(); }
});
