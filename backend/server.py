"""OriginFilter origin resolver, standard-library development server.

Run: ORIGINFILTER_ADMIN_TOKEN=secret python backend/server.py
For development only. Deploy behind HTTPS reverse proxy with authentication,
rate limiting, logging controls and licensed data ingestion before public use.
"""
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

DB_PATH = Path(os.environ.get("ORIGINFILTER_DB", str(Path(__file__).with_name("origins.sqlite3"))))
PORT = int(os.environ.get("PORT", "8787"))
BIND = os.environ.get("BIND", "127.0.0.1")
ADMIN_TOKEN = os.environ.get("ORIGINFILTER_ADMIN_TOKEN", "")
PLATFORMS = {"instagram", "facebook", "x"}
IDENTIFIER = re.compile(r"^[A-Za-z0-9._-]{1,80}$")
COUNTRY = re.compile(r"^[A-Z]{2}$")


def connect():
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    return db


def initialize():
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS origins (
            platform TEXT NOT NULL, handle TEXT NOT NULL,
            country TEXT, status TEXT NOT NULL, source TEXT NOT NULL,
            observed_at TEXT NOT NULL, expires_at TEXT,
            PRIMARY KEY (platform, handle))""")


def lookup(platform, handle):
    if platform not in PLATFORMS or not IDENTIFIER.fullmatch(handle):
        raise ValueError("Invalid platform or handle")
    with connect() as db:
        row = db.execute("SELECT * FROM origins WHERE platform=? AND handle=?",
                         (platform, handle.lower())).fetchone()
    if not row:
        return {"platform": platform, "handle": handle.lower(), "country": None, "status": "unknown"}
    result = dict(row)
    if result["expires_at"]:
        try:
            expiry = datetime.fromisoformat(result["expires_at"].replace("Z", "+00:00"))
            if expiry <= datetime.now(timezone.utc):
                result["country"], result["status"] = None, "unknown"
        except ValueError:
            result["country"], result["status"] = None, "unknown"
    return result


def upsert(data):
    platform = data.get("platform", "")
    handle = str(data.get("handle", "")).lower()
    country = data.get("country")
    status = data.get("status", "reported")
    source = str(data.get("source", ""))
    expires = data.get("expires_at")
    if platform not in PLATFORMS or not IDENTIFIER.fullmatch(handle):
        raise ValueError("Invalid platform or handle")
    if country is not None and (not isinstance(country, str) or not COUNTRY.fullmatch(country)):
        raise ValueError("Country must be an uppercase ISO 3166-1 alpha-2 code")
    if status not in {"verified", "reported", "probable", "unknown", "disputed"}:
        raise ValueError("Invalid status")
    if not source or len(source) > 300:
        raise ValueError("Evidence source is required")
    if expires is not None:
        try:
            datetime.fromisoformat(expires.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            raise ValueError("Invalid expiry timestamp")
    now = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute("""INSERT INTO origins
            (platform,handle,country,status,source,observed_at,expires_at)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(platform,handle) DO UPDATE SET
            country=excluded.country,status=excluded.status,
            source=excluded.source,observed_at=excluded.observed_at,
            expires_at=excluded.expires_at""",
            (platform, handle, country, status, source, now, expires))
    return lookup(platform, handle)


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, obj):
        payload = json.dumps(obj, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/health":
            return self.respond(200, {"ok": True})
        match = re.fullmatch(r"/v1/origin/(instagram|facebook|x)/([^/]+)", path)
        if not match:
            return self.respond(404, {"error": "not_found"})
        try:
            return self.respond(200, lookup(match[1], unquote(match[2])))
        except ValueError as exc:
            return self.respond(400, {"error": str(exc)})

    def do_POST(self):
        if urlsplit(self.path).path != "/v1/admin/origin":
            return self.respond(404, {"error": "not_found"})
        import hmac
        supplied = self.headers.get("Authorization", "")
        if not ADMIN_TOKEN or not hmac.compare_digest(supplied, "Bearer " + ADMIN_TOKEN):
            return self.respond(401, {"error": "unauthorized"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                return self.respond(413, {"error": "invalid_body_size"})
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError("Expected object")
            return self.respond(200, upsert(body))
        except (ValueError, json.JSONDecodeError) as exc:
            return self.respond(400, {"error": str(exc)})

    def log_message(self, fmt, *args):
        # Avoid logging creator identifiers in default request logs.
        pass


if __name__ == "__main__":
    initialize()
    print(f"OriginFilter development resolver listening at http://{BIND}:{PORT}")
    ThreadingHTTPServer((BIND, PORT), Handler).serve_forever()
