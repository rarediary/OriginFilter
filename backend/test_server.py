import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class ResolverTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "test.sqlite3"
        self.patch = patch.object(server, "DB_PATH", self.path)
        self.patch.start()
        server.initialize()

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def test_unknown(self):
        record = server.lookup("instagram", "missing")
        self.assertIsNone(record["country"])
        self.assertEqual(record["status"], "unknown")

    def test_insert_and_lookup(self):
        server.upsert({"platform": "instagram", "handle": "Example",
                       "country": "US", "source": "creator declaration"})
        self.assertEqual(server.lookup("instagram", "example")["country"], "US")

    def test_expiry(self):
        server.upsert({"platform": "x", "handle": "example", "country": "CA",
                       "source": "public disclosure", "expires_at": "2020-01-01T00:00:00Z"})
        self.assertEqual(server.lookup("x", "example")["status"], "unknown")

    def test_validation(self):
        with self.assertRaises(ValueError):
            server.upsert({"platform": "instagram", "handle": "bad/name",
                           "country": "US", "source": "test"})
        with self.assertRaises(ValueError):
            server.upsert({"platform": "instagram", "handle": "example",
                           "country": "USA", "source": "test"})


if __name__ == "__main__":
    unittest.main()
