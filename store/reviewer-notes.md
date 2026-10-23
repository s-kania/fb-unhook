# Certification notes — Facebook Unhook 0.7.2

## Purpose and environment

Single purpose: let users reduce distractions in the desktop Facebook interface, including restricting feeds to selected joined groups. This is a free extension with no purchases, donations, accounts, analytics or advertising. The extension popup is Polish. Facebook DOM recognition supports Polish and English. Test on desktop www.facebook.com in Microsoft Edge. Do not claim mobile support.

A Facebook session is required to see personal feeds and joined groups. There is no extension login. No publisher's Facebook credentials are supplied: testers should use an authorized test account belonging to at least one group, or arrange an appropriate test account before certification. Do not use the publisher's personal account. If Microsoft requires credentials, supply a dedicated authorized test account via the certification form, never this repository.

## Test procedure

1. Install, sign in to Facebook, then reload any previously open Facebook tabs.
2. Open the extension popup. On a fresh profile the first-run card explains local processing and the need to read the group list. Before configuration the group filter hides recognized posts; disabling `Tylko moje grupy` restores them.
3. Click `Odczytaj moje grupy` or `Aktualizuj`. Leave the new `https://www.facebook.com/groups/joins/` tab open and active until the count is complete. The list scrolls automatically. No individual group pages should open. Reopen the popup to see the last-successful-sync date.
4. Go to Facebook Home or Groups feed. Only recognized posts from enabled groups remain. Suggested groups, personal/profile posts and unrecognized sources are hidden. Facebook controls which posts are loaded; this extension is not a chronological or complete group reader.
5. Disable one group in the popup, or use the `Grupa` switch beside a visible post's close control. Its posts disappear without leaving the group. Re-enable it in the popup. Resync and verify that visibility choices remain.
6. Toggle reels, stories, composer, contacts, new-message button, sidebar, shortcuts and top navigation separately. The master switch restores the page's elements. Disabling only the group filter leaves independently selected layout controls active.
7. Scroll and reload: newly loaded recognized post containers stay hidden until classified. The small loading ring displays a number of loaded post containers; this includes filtered posts and is not a network progress percentage.
8. Visit a single group, profile, Messenger or Marketplace: feed post filtering must not run there. Layout controls have their own scope. A narrow browser may not have a left rail and therefore no replacement sidebar panel.
9. Close the sync tab early, or cancel via popup: an incomplete list must not replace the last complete list. Refresh memberships after changing Facebook accounts or membership; no automatic account binding is claimed.
10. The `Prywatność i pomoc` link opens a bundled offline page. Uninstalling removes local extension storage. No payment/donation link is present.

## Permissions and implementation disclosures

`storage`: persists settings, group names/IDs/URL aliases, disabled groups and synchronization status only in `chrome.storage.local`. No cloud sync.

Content script access to `https://www.facebook.com/*`: reads the rendered page to identify feed post sources and layout elements and applies local CSS/DOM visibility changes. Broad access within this single host is needed for Facebook's client-side navigation. No access to other sites, cookies, passwords, login tokens, browsing history API or private-message contents is requested.

MAIN-world script restricted to `https://www.facebook.com/groups/joins*`: observes embedded JSON and clones responses to existing Facebook fetch/XHR GraphQL calls only while the current route is exactly `/groups/joins/`. It does not issue/replay requests or modify request bodies. It extracts only the `all_joined_groups.tab_groups_list` connection, with `Group` type and `MEMBER` status. Minimal ID/URL/name records are passed via same-window messages; the isolated script validates origin/source, shapes and matches exact URLs to the visible joined-list DOM. The worker checks the sync tab/session and complete, conflict-free numeric IDs before saving. Bridge data is site-controlled input, not an authentication boundary.

No remote code. All executed extension JavaScript/CSS is packaged. Facebook JSON is parsed as data, never evaluated. No obfuscation, minification or production dependencies. Only `storage` is declared as an API permission. Opening the synchronization tab does not require a broad `tabs` permission.

## Data usage form

Disclose local access to website content, current Facebook route and joined-group membership data. The extension accesses personal data locally even though nothing is sent to the developer. Do not describe it as "accesses no data". Match the exact current Partner Center definitions when choosing the data-usage checkboxes; keep the declaration consistent with `site/privacy.html`. No sale, advertising, analytics, creditworthiness use or transfer to the publisher. Support and privacy contact: jsnetic@outlook.com. A public privacy URL must still be supplied before submission.

## Validation scope

Automated tests use synthetic data. A successful test run is not a Microsoft certification or a guarantee against future Facebook layout changes.

## Language selection

The globe button opens the language selector: Automatic (default), English and Polski. Automatic follows the browser UI language: Polish for pl, English otherwise. A manual selection is stored locally and updates the popup and already mounted extension controls on Facebook. It does not change Facebook’s own language or membership data. Privacy/help is provided in both languages. Verify language persistence after closing and reopening the popup, and switching back to Automatic.
