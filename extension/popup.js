'use strict';
const $ = id => document.getElementById(id);
let state = { ...FBUnhook.DEFAULTS };
$('version').textContent = chrome.runtime.getManifest().version;
async function command(message) {
  $('error').hidden = true;
  try {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.error) throw new Error(response.error);
    return response;
  } catch (error) { $('error').textContent = error.message; $('error').hidden = false; return null; }
}
async function render() {
  state = { ...FBUnhook.DEFAULTS, ...await chrome.storage.local.get(null) };
  for (const key of FBUnhook.SETTINGS) $(key).checked = state[key];
  $('count').textContent = state.groups.length;
  const sync = state.sync;
  const running = sync?.status === 'running';
  $('setup').hidden = !state.enabled || !state.groupsOnly || state.groups.length > 0 || !!state.lastSync;
  $('setup-sync').disabled = running;
  $('sync').disabled = running; $('cancel').hidden = !running;
  $('sync-status').textContent = running ? `Odczyt: ${sync.count}${sync.total == null ? '' : ' / ' + sync.total}. Pozostaw otwartą kartę grup.`
    : sync && ['partial', 'cancelled'].includes(sync.status) ? 'Nie odczytano kompletnej listy z ID grup. Poprzednia lista pozostała bez zmian. Spróbuj ponownie.'
    : state.lastSync ? `Ostatnia aktualizacja: ${new Date(state.lastSync).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}${Date.now() - state.lastSync > 7 * 86400000 ? ' · Warto odświeżyć listę.' : ''}`
    : 'Zaktualizuj listę przed pierwszym użyciem.';
  renderGroups();
  let status = !state.enabled ? 'Rozszerzenie wyłączone.' : !state.groupsOnly ? 'Filtr grup wyłączony.' : 'Filtr gotowy. Otwórz aktualności Facebooka.';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const info = await chrome.tabs.sendMessage(tab.id, { type: 'status' });
    if (state.enabled && state.groupsOnly) {
      if (!state.groups.length) status = 'Najpierw zaktualizuj listę grup. Feed czeka na konfigurację.';
      else if (info.route === 'feed') status = `${info.shown} widocznych · ${info.hidden} ukrytych postów na stronie.`;
      else status = 'Filtr działa w aktualnościach. Ten widok pozostaje bez zmian.';
    }
  } catch { /* The active tab may be outside Facebook, or need a refresh after installation. */ }
  $('status').textContent = status;
}
function renderGroups() {
  const query = $('search').value.toLocaleLowerCase('pl');
  const groups = state.groups.filter(g => `${g.name} ${g.id}`.toLocaleLowerCase('pl').includes(query)).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  $('groups').replaceChildren();
  $('empty').hidden = groups.length > 0;
  $('empty').textContent = state.groups.length ? 'Brak grup pasujących do wyszukiwania.' : 'Tutaj pojawią się Twoje grupy. Kliknij Aktualizuj, aby odczytać listę z Facebooka.';
  for (const group of groups) {
    const li = document.createElement('li'), a = document.createElement('a'), label = document.createElement('label'), toggle = document.createElement('input'), track = document.createElement('span');
    a.href = `https://www.facebook.com/groups/${encodeURIComponent(group.id)}/`; a.target = '_blank'; a.rel = 'noopener'; a.textContent = group.name;
    label.className = 'group-setting'; toggle.type = 'checkbox'; toggle.setAttribute('role', 'switch');
    toggle.checked = FBUnhook.groupEnabled(group, state.disabledGroups);
    toggle.setAttribute('aria-label', `Pokaż posty z grupy ${group.name}`);
    label.title = toggle.checked ? 'Ukryj posty tej grupy' : 'Przywróć posty tej grupy';
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
