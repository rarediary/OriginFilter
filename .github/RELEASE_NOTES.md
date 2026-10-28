# OriginFilter v0.8.0 — Public PC Beta

This is an **early experimental build** for Chrome/Chromium and Firefox desktop. It works with web feeds on **X, Facebook and YouTube**. The browser extension does not require Railway, paid hosting, an account, or an API key.

## What's included

- Text-based filtering to reduce non-English posts and video titles; language detection runs locally in your browser.
- Evidence-based account-country controls. **Unknown country is shown by default**; strict unknown-country blocking can hide most of a feed.
- Local keyword/account blocking, optional language-pattern learning, pause and per-post **Show once**.
- Optional public YouTube About lookups and optional clearly labeled sponsorships, **both off by default**. No paid sponsors are included.

## Download and install

**Chrome / Chromium desktop:** download `OriginFilter-chrome-0.8.0.zip`, extract it, open `chrome://extensions`, switch on **Developer mode**, select **Load unpacked**, then choose the extracted folder. Refresh X, Facebook and YouTube tabs.

**Firefox desktop:** download `OriginFilter-firefox-0.8.0.zip`, extract it, open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, then select the extracted `manifest.json`. This install **disappears on Firefox restart** until Mozilla signs a permanent add-on. Refresh social tabs.

The ZIPs are **source packages**, not signed store packages. Please review code/permissions before installing; never enter credentials into extension popups.

## Known limitations

**Not verified 80% effective**, not a guaranteed US-only filter, and **not yet tested against authenticated live feeds in this environment**. X and Facebook country information is incomplete, YouTube About country is self-declared, and video audio language is not analyzed. Platform layout changes may break detection. Native platform advertisements are not deliberately replaced.

## Help test

Report a bug or false positive here: https://github.com/rarediary/OriginFilter/issues/new/choose

Please include browser/version, site, what happened vs. what you expected, and whether strict-country mode was enabled. **Never share passwords, login cookies, private messages, or personal browsing history in reports.**

Independent project, not affiliated with X, Meta or Google. Contributions and constructive tester feedback welcome.
