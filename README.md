# OriginFilter

Early-stage browser extension for local feed filtering. Firefox first, Chrome second. Both now share the same filtering behavior.

## Current prototype (0.1.0)
- Supported web feeds: Instagram, Facebook and X/Twitter (best-effort DOM selectors).
- Block posts containing user-specified keywords.
- Block posts with links matching user-specified account handles.
- Optional Unicode **script** checks: Arabic, Devanagari, Cyrillic and Han.
- Dynamically rescan newly loaded posts; settings stored locally.

**Not implemented:** creator country-of-origin detection, actual language classification, cross-browser Android support, native-app filtering, billing or advertisements. Script detection is not proof of a language, nationality, or country. Site changes can break selectors. No claims of universal filtering.

## Install for testing

### Firefox desktop
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `firefox/manifest.json` in a local checkout.
4. Open a supported website, click the OriginFilter toolbar icon, configure rules and save.

Temporary add-ons disappear when Firefox restarts. The extension has not yet been signed or submitted for review.

### Chrome desktop
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose the `chrome/` folder.
4. Open a supported website and configure the extension.

## Testing checklist
- With filtering disabled, no posts should be hidden.
- Add a keyword seen in a test post, save, and check whether the post disappears.
- Remove the keyword and check whether the post returns.
- Check infinite scroll and page navigation on each supported site.
- Verify no browser console errors, unexpected layout changes or excessive CPU usage.
- Confirm the filters do not incorrectly classify script or country of origin.

## Architecture and roadmap
1. Verify selectors on real feeds; add fixture-based automated tests.
2. Extract shared filtering engine and per-site adapters.
3. Add proper language identification, avoiding script-only false positives.
4. Research creator-country evidence, confidence and unknown-origin policy.
5. Test Android delivery separately. Chrome Android does not load ordinary desktop extensions.
6. Validate privacy, store policies and willingness to pay before subscriptions.

## Monetization principles
Free local keyword filtering can build trust; paid features could include validated creator-country classifications and synchronized rules. Do **not** inject ads into third-party feeds without explicit opt-in, conspicuous sponsorship labels and a policy/legal review. No ad injection is implemented. Do not sell browsing histories.

## Privacy
This prototype stores rules in browser-local extension storage and does not call a remote classification server. It accesses DOM content on the supported websites to apply local filters.
