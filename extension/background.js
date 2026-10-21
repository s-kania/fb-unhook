importScripts('core.js');
// Retire the old background navigation job without touching memberships or preferences.
let queue = chrome.storage.local.set({ resolver: null, aliasSummary: null });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Serialize read/modify/write so a sync cannot overwrite a simultaneous manual change.
  queue = queue.catch(() => {}).then(() => handle(message, sender));
  queue.then(sendResponse, error => sendResponse({ error: error.message }));
  return true;
});
async function handle(message, sender) {
  const state = { ...FBUnhook.DEFAULTS, ...await chrome.storage.local.get(null) };
  const fromPopup = !sender.tab && sender.url === chrome.runtime.getURL('popup.html');
  const fromFacebook = !!sender.tab && /^https:\/\/www\.facebook\.com\//.test(sender.url || '');
  if (message.type === 'group-visibility' && (fromPopup || fromFacebook)) {
    const group = state.groups.find(g => g.id === message.id);
    if (!group || typeof message.visible !== 'boolean') return { error: 'Nieznana grupa lub niepoprawne ustawienie.' };
    const keys = [group.id, ...(group.aliases || [])];
    const disabled = new Set(state.disabledGroups);
    for (const key of keys) { if (message.visible) disabled.delete(key); else disabled.add(key); }
    await chrome.storage.local.set({ disabledGroups: [...disabled] });
    return { ok: true };
  }
  if (message.type === 'settings' && fromPopup) {
    const patch = {};
    for (const key of FBUnhook.SETTINGS) if (typeof message[key] === 'boolean') patch[key] = message[key];
    await chrome.storage.local.set(patch);
    return { ok: true };
  }
  if (message.type === 'begin-sync' && fromPopup) {
    const tab = await chrome.tabs.create({ url: 'https://www.facebook.com/groups/joins/?nav_source=tab&ordering=viewer_added' });
    await chrome.storage.local.set({ sync: { tabId: tab.id, startedAt: Date.now(), status: 'running', count: 0, total: null } });
    return { ok: true };
  }
  if (message.type === 'sync-result' && sender.tab?.id === state.sync?.tabId && state.sync.status === 'running' &&
      message.startedAt === state.sync.startedAt && fromFacebook && FBUnhook.route(new URL(sender.url).pathname) === 'joins') {
    const incoming = Array.isArray(message.groups) ? message.groups : [];
    const validKey = id => typeof id === 'string' && id === FBUnhook.groupKey('/groups/' + id + '/');
    const groups = incoming.filter(g => g && validKey(g.id) && /^\d{1,30}$/.test(g.id) && typeof g.name === 'string').map(g => {
      const aliases = [...new Set((Array.isArray(g.aliases) ? g.aliases : []).filter(validKey))].filter(id => id !== g.id);
      const keys = [g.id, ...aliases];
      const previous = state.groups.filter(old => [old.id, ...(old.aliases || [])].some(id => keys.includes(id)));
      return { id: g.id, name: g.name.slice(0, 200), aliases: [...new Set([...aliases, ...previous.flatMap(old => [old.id, ...(old.aliases || [])])])].filter(id => id !== g.id) };
    });
    const owners = new Map(); let conflict = false;
    for (const group of groups) for (const key of [group.id, ...group.aliases]) {
      if (owners.has(key) && owners.get(key) !== group.id) conflict = true;
      owners.set(key, group.id);
    }
    const complete = message.complete === true && Number.isInteger(message.total) && message.total >= 0 &&
      groups.length === incoming.length && groups.length === message.total && new Set(groups.map(g => g.id)).size === groups.length && !conflict;
    if (complete) {
      const disabled = new Set(state.disabledGroups);
      for (const group of groups) if (!FBUnhook.groupEnabled(group, state.disabledGroups)) for (const key of [group.id, ...group.aliases]) disabled.add(key);
      await chrome.storage.local.set({ groups, disabledGroups: [...disabled], lastSync: Date.now(), sync: { ...state.sync, status: 'complete', count: groups.length, total: message.total } });
    } else {
      // Never replace a good list with one containing missing or ambiguous numeric IDs.
      await chrome.storage.local.set({ sync: { ...state.sync, status: message.done ? 'partial' : 'running', count: groups.length, total: message.total ?? null } });
    }
    return { ok: true };
  }
  if (message.type === 'cancel-sync' && (fromPopup || sender.tab?.id === state.sync?.tabId)) {
    await chrome.storage.local.set({ sync: state.sync ? { ...state.sync, status: 'cancelled' } : null });
    return { ok: true };
  }
  if (message.type === 'add-group' && fromPopup) {
    const id = FBUnhook.groupKey(message.url);
    if (!id) throw new Error('Wklej poprawny link do grupy na Facebooku.');
    const groups = state.groups.filter(g => g.id !== id);
    groups.push({ id, name: String(message.name || id).trim().slice(0, 200), aliases: [] });
    await chrome.storage.local.set({ groups });
    return { ok: true };
  }
  if (message.type === 'remove-group' && fromPopup) {
    await chrome.storage.local.set({ groups: state.groups.filter(g => g.id !== message.id) });
    return { ok: true };
  }
  if (message.type === 'hello' && sender.tab) return { tabId: sender.tab.id };
  if (message.type === 'post-group-alias' && fromFacebook && FBUnhook.route(new URL(sender.url).pathname) === 'feed') {
    const group = state.groups.find(g => g.id === message.id);
    const alias = typeof message.alias === 'string' && FBUnhook.groupKey('/groups/' + message.alias + '/');
    if (!group || !alias || alias !== message.alias ||
        state.groups.some(g => g !== group && [g.id, ...(g.aliases || [])].includes(alias))) return { error: 'Nieznana lub niejednoznaczna grupa.' };
    if ([group.id, ...(group.aliases || [])].includes(alias)) return { ok: true };
    const disabledGroups = FBUnhook.groupEnabled(group, state.disabledGroups) ? state.disabledGroups : [...new Set([...state.disabledGroups, alias])];
    await chrome.storage.local.set({
      groups: state.groups.map(g => g === group ? { ...g, aliases: [...(g.aliases || []), alias] } : g),
      disabledGroups
    });
    return { ok: true };
  }
  return { error: 'Nieobsługiwane polecenie.' };
}
chrome.tabs.onRemoved.addListener(tabId => {
  queue = queue.catch(() => {}).then(async () => {
    const { sync } = await chrome.storage.local.get(null);
    if (sync?.tabId === tabId && sync.status === 'running') await chrome.storage.local.set({ sync: { ...sync, status: 'cancelled' } });
  });
});
