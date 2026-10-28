# OriginFilter 0.6.0

PC-only development build. Firefox first, Chrome second. **X, Facebook and YouTube** are the current targets; Instagram and Android are out of this phase.

## Implemented

- Browser-native, local text-language detection instead of alphabet-to-language guesses.
- English-only rules, keyword blocking and account blocking.
- Incremental card processing, bounded language cache, and recycled-card handling.
- Separate known-country and unknown-country decisions. Unknown never means foreign.
- Strict country mode (US by default) with explanatory placeholders and Show once.
- Optional direct public YouTube About lookups, no API key or OriginFilter server. Consent required; login cookies omitted. One request per 10 seconds, 120/day maximum, timeout and backoff on access errors. Country results cache for seven days; missing/error results also cache.
- Passive X account-country disclosure capture when the user opens `/handle/about`. This does NOT automatically investigate every timeline author.
- Country cache, source labels, expiry and deletion controls. Legacy manual records remain personal overrides.
- Same shared source for both browsers, bundled privacy notice, logo and build script.

## Important limitations

**This is not a finished automatic US-only commercial service.** Facebook's automatic origin source is unresolved. X origin coverage depends on disclosures actually encountered. The YouTube parser only accepts explicit About-country metadata bound to a channel ID; if a page is unavailable, changes format, or omits country, the result is unknown. YouTube country is self-declared, not proof of residence. Video/audio language is not analyzed; YouTube filtering uses titles. Store signing/publishing, live logged-in compatibility and sponsorship sales are not completed.

Strict mode may hide most posts because many countries are unknown. Switch “When account country is unknown” to Show for less restrictive operation. No proxy, VPN, server-side region hack, private-message inspection, IP attribution, race classification, or hidden AI service is used.

## Install on PC

Firefox: extract `dist/OriginFilter-firefox-0.6.0.zip`; open `about:debugging#/runtime/this-firefox`; select Load Temporary Add-on and the extracted `manifest.json`. This temporary install ends on browser restart. A signed Firefox store package has not been obtained.

Chrome: extract `dist/OriginFilter-chrome-0.6.0.zip`; open `chrome://extensions`, enable Developer mode, choose Load unpacked and select the extracted folder.

Refresh already open supported tabs after installation. Open the toolbar popup, choose your rules and save. Public YouTube lookups are OFF until you explicitly consent. No paid service is required.

## Build and checks

Python 3.10+ and Node 18+:

```
python tools/build.py
node --test tests/core.test.js
```

Optional synthetic DOM checks need Python Playwright and Chromium:

```
python tests/browser_smoke.py
```

`extension/` is canonical. `firefox/` and `chrome/` are generated copies with browser-specific manifests. The browser ZIPs deliberately place `manifest.json` at the ZIP root, as required for extension packaging; the source ZIP has a matching top-level folder.

### Verification performed in this development session

24 core tests passed. Synthetic Chromium 144 DOM checks passed for all three adapters, including new-card detection, language decisions with a mocked detector, cached-country changes, strict unknown handling, pause/restoration and no repeated idle classifications. This environment blocks actual extension installation and external social-page navigation by administrator policy. The checks therefore used local synthetic DOMs, mocked extension APIs/language results and a fixture URL—not logged-in feeds, installed Firefox, or the native language model. See `tests/browser-results.json`.

## Monetization

The chosen model remains free filtering supported by occasional explicitly disclosed, opt-in sponsorships. No advertising, ad network, payment processing or billing is active in this build. Do not sell browsing histories or treat a technical placement as permission to inject advertisements into other sites.

## Previous backend

Existing `backend/` code remains in GitHub as a separate experimental development API. Version 0.6.0 does not call it or require hosting. It is not a production service and should not be exposed publicly.

## Technical references

- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/detectLanguage
- https://developer.chrome.com/docs/extensions/reference/api/i18n
- https://developers.google.com/youtube/data/reference/rest/v3/channels
- https://help.x.com/en/managing-your-account/how-to-change-country-settings
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
