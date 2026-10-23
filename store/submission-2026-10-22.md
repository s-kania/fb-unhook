# Edge submission — 2026-10-22

Historical record of the submission on 2026-10-22. Status and estimates below refer to that date, not a live Partner Center check. The submitted certification notes are preserved verbatim; working materials are linked from [README.md](README.md).

- Version: 0.7.2
- Status recorded in Partner Center on 2026-10-22: In review
- Visibility: Public
- Languages: English, Polish
- Product ID: 8f29409b-406c-40bb-beb1-32fdd4abd11e
- Store ID: 0RDCKBQMLPHQ
- Store CRX ID: gimhndajdfpflaippihehlmangjhjcdp
- Privacy URL entered: https://brickfiction.pl/en/facebook-unhook/privacy/
- Privacy website commit: 83a6420c2242bf9e2d5dc63c5252903413c04def
- Successful website deployment: https://github.com/s-kania/s-kania.github.io/actions/runs/39773496974
- At submission, Partner Center estimated a response within 7 business days. No public listing URL was recorded.

## Submitted certification notes

Facebook Unhook 0.7.2 filters desktop Facebook feeds by joined groups and hides selected interface elements. Free; no extension account, payments or remote code. Menus and Facebook detection support English and Polish.

Testing requires an existing Facebook account that belongs to at least one group. No publisher account credentials are supplied: the extension works with the tester's own Facebook session and memberships, and sharing the publisher's personal account would expose unrelated private data. Please use an authorized test account; contact jsnetic@outlook.com if further access arrangements are needed.

1. Install, sign in at www.facebook.com and reload existing Facebook tabs. Open the extension menu and enable it if needed.
2. Select Read my groups. Keep the Your groups tab open until reading finishes. Only this list is scrolled; individual groups are not opened. Before the first successful read, the group filter hides recognized posts; turn off Only my groups to restore them.
3. Return to Home or Groups feed. Posts from enabled joined groups remain. Exclude a group in the menu or with the Group switch beside a post, then re-enable it in the menu. Membership is unchanged.
4. Test each layout switch: reels, stories, composer, left sidebar, shortcuts, contacts, new-message button and top navigation. Turning off the extension restores the view.
5. Use the globe icon to select English/Polski/Automatic; reopen the menu to check persistence. Refresh groups after switching Facebook accounts or changing memberships.

Filtering applies only to posts Facebook loads in feeds, not individual group pages, profiles, Messenger or Marketplace. An incomplete group refresh preserves the prior list. Settings and group records stay in chrome.storage.local; no data goes to the publisher. The loading counter counts loaded post containers, including hidden ones.

Privacy: https://brickfiction.pl/en/facebook-unhook/privacy/
