# Local origin resolver

This is a runnable **development API**, not a deployed commercial service. Uses Python 3.10+ standard library and SQLite. No third-party origin provider is connected. Only records you explicitly insert will return a country.

Start:

```bash
ORIGINFILTER_ADMIN_TOKEN=change-me python backend/server.py
```

Add an evidenced test account from a second terminal:

```bash
curl -X POST http://127.0.0.1:8787/v1/admin/origin \
  -H 'Authorization: Bearer change-me' -H 'Content-Type: application/json' \
  -d '{"platform":"instagram","handle":"example","country":"US","status":"reported","source":"manual test record"}'
```

Read:
```bash
curl http://127.0.0.1:8787/v1/origin/instagram/example
```

Tests: `cd backend && python -m unittest test_server.py`

Before production: HTTPS, API authentication, rate limiting, abuse prevention, commercially licensed evidence providers, privacy review, persistent deployment, and consent-driven extension integration. Do not expose this development server directly to the public internet.
