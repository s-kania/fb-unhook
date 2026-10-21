const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const C = require('../extension/core.js');
const dom = html => new JSDOM(html, { url: 'https://www.facebook.com/' }).window.document;
const groups = [{ id: '123', name: 'Moja grupa' }];
test('normalizes real group links and rejects external or reserved URLs', () => {
  assert.equal(C.groupKey('/groups/My.Group/?tracking=1'), 'my.group');
  assert.equal(C.groupKey('https://m.facebook.com/groups/123/posts/456'), '123');
  for (const url of ['https://evil.test/groups/123', 'https://facebook.com.evil.test/groups/123', '/groups/feed/', '/groups/joins/', 'javascript:alert(1)', '/groups/%2F123']) assert.equal(C.groupKey(url), null);
});
test('filters only home and group feeds, never group pages, profiles or individual posts', () => {
  for (const p of ['/', '/groups/feed/', '/home.php']) assert.equal(C.route(p), 'feed');
  for (const p of ['/groups/123/', '/groups/123/posts/456/', '/user', '/marketplace/', '/reel/123']) assert.equal(C.route(p), 'other');
  assert.equal(C.route('/groups/joins/'), 'joins');
});
test('recognizes membership from the source heading', () => {
  const doc = dom('<article><h4><a href="/groups/123/">Moja grupa</a></h4><p>Treść</p></article>');
  assert.equal(C.classify(doc.querySelector('article'), groups).visible, true);
  assert.equal(C.classify(doc.querySelector('article'), []).visible, false);
});
test('recommended groups do not pass the membership filter', () => {
  const doc = dom('<article><h4><a href="/groups/999/">Polecana grupa</a></h4></article>');
  assert.equal(C.classify(doc.querySelector('article'), groups).visible, false);
});
test('a group link in body, comment or embedded shared post cannot whitelist a personal post', () => {
  const doc = dom('<article><h4><a href="/person/">Osoba</a></h4><p><a href="/groups/123/">Polecam grupę</a></p><article><h4><a href="/groups/123/">Udostępniony post</a></h4></article></article>');
  assert.equal(C.classify(doc.querySelector('article'), groups).visible, false);
});
test('group user links alone do not identify a group source', () => {
  const doc = dom('<article><h4><a href="/groups/123/user/99/">Autor</a></h4></article>');
  assert.equal(C.classify(doc.querySelector('article'), groups).visible, false);
});
test('post containers are top-level and exclude dialogs and headings', () => {
  const doc = dom('<main role="main"><div role="feed"><h3>Posty</h3><div id="outer"><div data-pagelet="FeedUnit_0"><h4>Autor</h4><div role="article">Komentarz</div></div></div><div aria-label="Ładowanie…"></div></div><div role="dialog"><div role="feed"><div role="article">Modal</div></div></div></main>');
  assert.deepEqual(C.postUnits(doc).map(e => e.getAttribute('data-pagelet')), ['FeedUnit_0']);
});
test('never hides the wrapper shared by multiple posts and pagination sentinels', () => {
  const doc = dom('<main role="main"><div role="feed"><div id="shared"><div data-pagelet="FeedUnit_0"><h4><a href="/person">Person</a></h4></div><div data-pagelet="FeedUnit_1"><h4><a href="/groups/123/">Group</a></h4></div><div id="sentinel" role="article" aria-label="Loading"></div></div></div></main>');
  assert.deepEqual(C.postUnits(doc).map(e => e.getAttribute('data-pagelet')), ['FeedUnit_0', 'FeedUnit_1']);
});
test('supports pagelet fallback when no feed role is present', () => {
  const doc = dom('<main role="main"><div data-pagelet="FeedUnit_0"><h3>Autor</h3></div></main>');
  assert.equal(C.postUnits(doc).length, 1);
});
test('joined group collection excludes sidebar and recommendations, deduplicates cards', () => {
  const doc = dom('<nav><a href="/groups/999/">Skrót</a></nav><main role="main"><section><div><h2>Wszystkie grupy, do których należysz (2)</h2></div><div role="list"><div><a href="/groups/123/">Grupa A</a><a href="/groups/123/">Zobacz grupę</a></div><div><a href="/groups/abc/">Grupa B</a></div></div></section><section><h2>Polecane grupy</h2><a href="/groups/456/">Polecana</a></section></main>');
  const result = C.joinedGroups(doc);
  assert.equal(result.total, 2);
  assert.deepEqual(result.groups.map(g => [g.id, g.name]), [['123', 'Grupa A'], ['abc', 'Grupa B']]);
});
test('does not treat unrecognized or loading membership views as empty complete lists', () => {
  const result = C.joinedGroups(dom('<main role="main"><h2>Ładowanie…</h2></main>'));
  assert.equal(result.recognized, false); assert.equal(result.total, null);
});
test('English membership count and zero groups', () => {
  assert.equal(C.joinedGroups(dom('<main role="main"><h2>All groups you’ve joined (1,234)</h2><div role="list"></div></main>')).total, 1234);
  assert.equal(C.joinedGroups(dom('<main role="main"><h2>Wszystkie grupy, do których należysz (0)</h2></main>')).total, 0);
});
test('learns a numeric alias from the same source header, including disabled groups', () => {
  const article = dom('<article><header><div><span><div><h4><a href="/groups/my-group/">Group</a></h4></div></span></div><a href="/groups/123/user/99/">Author</a><a href="/groups/123/?multi_permalinks=44">Time</a></header><p><a href="/groups/999/posts/1/">Body</a></p></article>').querySelector('article');
  const known = [{ id: 'my-group', aliases: [] }];
  assert.deepEqual(C.postGroupAlias(article, known), { id: 'my-group', alias: '123' });
  assert.equal(C.classify(article, known, ['my-group']).blocked, true);
  assert.equal(C.postGroupAlias(article, []), null);
  assert.equal(C.postGroupAlias(article, [{ id: 'my-group', aliases: ['123'] }]), null);
  assert.equal(C.postGroupAlias(article, [...known, { id: '123' }]), null);
  assert.equal(C.classify(dom('<article><h4><a href="/groups/123/">Group</a></h4></article>').querySelector('article'), [{id:'my-group',aliases:['123']}]).visible, true);
});
test('does not learn aliases from post text, comments, shared posts, matching names or conflicting headers', () => {
  const known = [{ id: 'my-group', name: 'Group' }];
  for (const html of [
    '<header><h4><a href="/groups/my-group/">Group</a></h4></header><p><a href="/groups/123/posts/1/">Body</a></p>',
    '<h4><a href="/groups/my-group/">Group</a></h4><a href="/groups/123/user/99/">Body link</a>',
    '<header><h4><a href="/groups/my-group/">Group</a></h4><article role="article"><a href="/groups/123/user/99/">Comment</a></article></header>',
    '<header><h4><a href="/groups/my-group/">Group</a></h4><h4><a href="/groups/123/">Shared post</a></h4><a href="/groups/123/user/99/">Author</a></header>',
    '<header><h4><a href="/groups/unknown/">Group</a></h4><a href="/groups/123/user/99/">Author</a></header>',
    '<header><h4><a href="/groups/my-group/">Group</a></h4><a href="/groups/123/user/99/">Author</a><a href="/groups/456/posts/1/">Conflict</a></header>'
  ]) assert.equal(C.postGroupAlias(dom('<article>'+html+'</article>').querySelector('article'), known), null, html);
});

test('joined-list links map to numeric IDs by exact URL, never by display name or cached aliases', () => {
  const doc = dom('<main role="main"><h2>Wszystkie grupy, do których należysz (3)</h2><div role="list"><a href="/groups/vanity/?ref=x">Identical name</a><a href="/groups/other/">Identical name</a><a href="/groups/555/">Numeric</a></div></main>');
  const records = [{ id: '123', url: 'https://www.facebook.com/groups/vanity/', name: 'Different name' }, { id: '999', url: 'https://www.facebook.com/groups/recommendation/' }];
  const result = C.joinedGroups(doc, records);
  assert.deepEqual(result.groups.map(g=>g.id), ['123', 'other', '555']);
  assert.deepEqual(result.groups[0].aliases, ['vanity']);
  assert.equal(result.groups[0].sourceKey, 'vanity');
  records.push({ id: '456', url: 'https://www.facebook.com/groups/vanity/' });
  assert.equal(C.joinedGroups(doc, records).groups[0].id, 'vanity');
});
