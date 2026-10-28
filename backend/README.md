# OriginFilter Origin Resolver

A planned privacy-conscious account-country classification service. This folder defines the initial data contract and PostgreSQL schema. **No live provider is connected yet.**

## Read-only API contract
`GET /v1/origin/{platform}/{account_id}`

Example response:
```json
{"platform":"instagram","account_id":"12345","country":"US","status":"reported","confidence":0.85,"source":"platform_disclosure","observed_at":"2026-10-28T00:00:00Z"}
```
These values are illustrative, not actual classification evidence. If a record is absent, expired or unsupported, respond with `country:null,status:"unknown"`. Never fabricate a country.

## Planned provider pipeline
1. Platform-disclosed account country, where legally and technically accessible.
2. Licensed third-party account-country provider, with commercial cache/redistribution rights verified.
3. Verified public publisher location and voluntary creator declarations.
4. Conflicting or weak evidence => unknown/disputed, not a fabricated location.

Do not infer country from name, race, appearance, or language. Language filtering is a separate feature.

## Business and privacy requirements
- Cache results by stable platform account ID; handles can change.
- Keep evidence and timestamp; expire records; handle corrections.
- No user browsing histories stored in the account-origin database.
- Avoid collecting personal contact details from providers.
- No API credentials in extensions, repository or client bundles.
- Use HTTPS, authentication, rate limits and abuse controls.
- Obtain consent and publish an accurate privacy policy before enabling remote lookups.
- Verify third-party provider terms before commercial use.

## Milestones
- Implement a read-only resolver service using this schema.
- Validate a provider on a representative account sample.
- Add optional remote resolver to the extensions after privacy disclosures.
- Measure unknown rate, error rate, cost per unique account and cache hit rate.
