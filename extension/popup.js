'use strict';
const $ = id => document.getElementById(id);
const I = FBUnhookI18n, t = I.t;
I.translate(document);
let renderVersion = 0;
let state = { ...FBUnhook.DEFAULTS };
$('version').textContent = chrome.runtime.getManifest().version;
async function command(message) {
  $('error').hidden = true;
  try {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.error) throw new Error(response.errorKey ? t(response.errorKey) : t('commandError'));
    return response;
  } catch (error) { $('error').textContent = error.message || t('commandError'); $('error').hidden = false; return null; }
}
async function render() {
  const version = ++renderVersion;
  const saved = await chrome.storage.local.get(null);
  if (version !== renderVersion) return;
  state = { ...FBUnhook.DEFAULTS, ...saved };
  I.setLanguage(state.language);
  I.translate(document);
  $('language').value = ['pl', 'en'].includes(state.language) ? state.language : 'auto';
  $('language-code').textContent = I.language.toUpperCase();
  document.querySelector('footer a').href = I.language === 'pl' ? 'privacy.html' : 'privacy-en.html';
  for (const key of FBUnhook.SETTINGS) $(key).checked = state[key];
  $('count').textContent = state.groups.length;
  const sync = state.sync;
  const running = sync?.status === 'running';
  $('setup').hidden = !state.enabled || !state.groupsOnly || state.groups.length > 0 || !!state.lastSync;
  $('setup-sync').disabled = running;
  $('sync').disabled = running; $('cancel').hidden = !running;
  $('sync-status').textContent = running ? t('syncRunning', { count: sync.count, total: sync.total == null ? '' : ' / ' + sync.total })
    : sync && ['partial', 'cancelled'].includes(sync.status) ? t('syncPartial')
    : state.lastSync ? t('lastSync', { date: new Date(state.lastSync).toLocaleString(I.language, { dateStyle: 'short', timeStyle: 'short' }), reminder: Date.now() - state.lastSync > 7 * 86400000 ? t('syncReminder') : '' })
    : t('syncFirst');
  renderGroups();
  let status = !state.enabled ? t('disabled') : !state.groupsOnly ? t('filterOff') : t('filterReady');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const info = await chrome.tabs.sendMessage(tab.id, { type: 'status' });
    if (state.enabled && state.groupsOnly) {
      if (!state.groups.length) status = t('notConfigured');
      else if (info.route === 'feed') status = t('feedStats', info);
      else status = t('otherView');
    }
  } catch { /* The active tab may be outside Facebook, or need a refresh after installation. */ }
  if (version === renderVersion) $('status').textContent = status;
}
function renderGroups() {
  const query = $('search').value.toLocaleLowerCase(I.language);
  const groups = state.groups.filter(g => `${g.name} ${g.id}`.toLocaleLowerCase(I.language).includes(query)).sort((a, b) => a.name.localeCompare(b.name, I.language));
  $('groups').replaceChildren();
  $('empty').hidden = groups.length > 0;
  $('empty').textContent = state.groups.length ? t('noMatches') : t('emptyGroups');
  for (const group of groups) {
    const li = document.createElement('li'), a = document.createElement('a'), label = document.createElement('label'), toggle = document.createElement('input'), track = document.createElement('span');
    a.href = `https://www.facebook.com/groups/${encodeURIComponent(group.id)}/`; a.target = '_blank'; a.rel = 'noopener'; a.textContent = group.name;
    label.className = 'group-setting'; toggle.type = 'checkbox'; toggle.setAttribute('role', 'switch');
    toggle.checked = FBUnhook.groupEnabled(group, state.disabledGroups);
    toggle.setAttribute('aria-label', t('showGroup', { name: group.name }));
    label.title = toggle.checked ? t('hideGroup') : t('restoreGroup');
    track.className = 'switch'; track.setAttribute('aria-hidden', 'true');
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      if (!await command({ type: 'group-visibility', id: group.id, visible: toggle.checked })) { toggle.checked = !toggle.checked; toggle.disabled = false; }
    });
    label.append(toggle, track); li.append(a, label); $('groups').append(li);
  }
}
for (const key of FBUnhook.SETTINGS) $(key).addEventListener('change', () => command({ type: 'settings', [key]: $(key).checked }));
$('sync').addEventListener('click', async () => { $('sync').disabled = true; if (!await command({ type: 'begin-sync' })) $('sync').disabled = false; });
$('setup-sync').addEventListener('click', () => $('sync').click());
$('cancel').addEventListener('click', () => command({ type: 'cancel-sync' }));
$('search').addEventListener('input', renderGroups);
$('add').addEventListener('submit', async event => {
  event.preventDefault();
  if (await command({ type: 'add-group', url: $('url').value, name: $('name').value })) { $('add').reset(); }
});
chrome.storage.onChanged.addListener(() => void render());
void render();

$('language-button').addEventListener('click', () => {
  const open = $('language-menu').hidden;
  $('language-menu').hidden = !open;
  $('language-button').setAttribute('aria-expanded', String(open));
  if (open) $('language').focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('language-menu').hidden) {
    $('language-menu').hidden = true;
    $('language-button').setAttribute('aria-expanded', 'false');
    $('language-button').focus();
    event.preventDefault();
  }
});
$('language').addEventListener('change', async () => {
  $('language').disabled = true;
  await command({ type: 'settings', language: $('language').value });
  await render();
  $('language').disabled = false;
});
