# OriginFilter — free desktop social-feed filter (public beta v0.8.0)

**[Download Chrome beta](https://github.com/rarediary/OriginFilter/releases/download/v0.8.0/OriginFilter-chrome-0.8.0.zip)** · **[Download Firefox beta](https://github.com/rarediary/OriginFilter/releases/download/v0.8.0/OriginFilter-firefox-0.8.0.zip)** · **[Report bugs / become a tester](https://github.com/rarediary/OriginFilter/issues/1)**

**What it does:** Reduces non-English text and filters accounts with available non-US country evidence on the **X, Facebook and YouTube websites**. Supports a US country allowlist, keyword/account blocking and a local-first design. **Account origin is often unknown; this is not guaranteed US-only content.** The 80% reduction target is not yet measured on live feeds.

### Install in two minutes

- **Chrome/Chromium desktop:** extract the Chrome ZIP, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and select the extracted folder.
- **Firefox desktop:** extract the Firefox ZIP, open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, choose `manifest.json` in the extracted folder. Firefox removes this temporary install on restart; public signed add-on publication is still pending.

Reload your open X/Facebook/YouTube tabs, then open the extension popup to choose settings. Country lookups and sponsored notices are off until enabled. You don't need an account, money, or external hosting.

**This is experimental:** browser checks were synthetic; live authenticated sites and country coverage still need testing. Please help by reporting which filters work and which don't. Do not share credentials, private browsing data or personal messages.

---

## Technical details — v0.8.0

**PC-only development release:** Firefox and Chrome. Supported sites: X, Facebook and YouTube websites (not their native apps). Instagram and Android are on hold.

## Working features

- English-language text filtering using the browser's language detector, with an immediate non-Latin script shortcut for confidently non-English writing.
- Local keyword and account blocking.
- Country allowlist (US by default) for accounts with reliable country evidence. New installs show unknown countries by default to prevent an empty feed; strict US-only is still an option.
- Optional direct public YouTube channel About lookup with daily limits, no login cookies, local cache.
- Country disclosure capture from X About pages actually visited.
- Incremental feed processing, reversible filtering and a Show once button. Optional locally learned language patterns reduce repeated analysis of uncertain posts. No country is guessed from language.
- **Opt-in, no-tracking sponsor placement engine:** labels, removable settings, at most two/day, one per 12 blocked posts, 30-minute cooldown. **No paying sponsor is bundled and no payment processor is connected.** A demo appears only inside the popup.
- Safeguards to avoid filtering identified native paid posts on supported sites.

## Important limits

**This does not reliably show only US-origin content.** Most accounts don't provide accessible country evidence, and automated Facebook-origin detection remains unavailable. Unknown-country strict mode may hide most posts. Native video speech language is not analyzed. Website changes can break adapters. The extension has not been tested on live authenticated feeds or published in extension stores. Revenue is $0 until a payment processor and actual advertisers are connected.

## Install locally on PC

Firefox: extract the Firefox ZIP. Open `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → choose `manifest.json` from the extracted folder. Firefox temporary installs disappear after restart. Store publication requires Mozilla signing.

Chrome: extract the Chrome ZIP. Open `chrome://extensions` → Developer mode → Load unpacked → select the extracted folder.

Refresh already-open X, Facebook and YouTube tabs. Open the extension popup to configure the filters. Optional YouTube country lookups and sponsorships are OFF until expressly enabled.

## Build / validation

Python 3.10+ and Node 18+ required:

```
python tools/build.py
node --test tests/core.test.js tests/ads.test.js tests/practical.test.js
python tests/browser_smoke.py
python tests/sponsor_browser.py
```

The core and ad scheduler unit tests and synthetic browser tests were run in this workspace. Synthetic tests use mocked browser APIs and do NOT validate store approvals, live social feeds, production country coverage, payments or ad sales.

`extension/` is the canonical shared implementation. `firefox/` and `chrome/` are generated separately. Archive `manifest.json` appears at the ZIP root.

## Business

Core filtering remains free, with optional sponsored notices. Campaigns are built into a static catalog: `extension/sponsor-catalog.json`. See `advertising/README.md` for campaign format and policy restrictions, and `marketing/LAUNCH.md` for a zero-hosting launch strategy. No Stripe connection, payout setup, signed store listing, or public Reddit announcement exists yet.

## Privacy

No extension-operated server, analytics SDK, browser-history sale, automated reporting, or ad click telemetry. Country records, sponsor counters and preferences stay local. Optional YouTube channel requests go directly to YouTube and disclose requested channel IDs/handles to YouTube's servers. See `extension/privacy.html`.

## Practical improvement target

80% fewer unwanted posts is a **goal, not a measured result**. Real-world effectiveness depends on the composition of the feed and country evidence availability. The built-in stats report actual filtered cards; no claim of 80% accuracy is made. The balanced default prioritizes visible improvements without hiding every unknown account. Strict mode remains available, but can empty a feed.
