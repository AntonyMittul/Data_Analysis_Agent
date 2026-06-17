"""Chat session storage backed by SQLite.

SQLite is a tiny, file-based database built into Python — no server, no setup,
just a single file (chat.db). It replaces the old per-session JSON files while
keeping the same function names, so the rest of the app is unchanged.

Two tables:
  sessions(session_id, title, file_name, doc_id, kind, created_at)
  messages(id, session_id, role, content, created_at)
"""
import os
import json
from datetime import datetime

from app.memory.db import conn as _conn, lock as _lock

LEGACY_DIR = "sessions"  # old JSON store (migrated once, then ignored)


def _now() -> str:
    return datetime.now().isoformat()


def _init_db():
    with _lock:
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id  TEXT PRIMARY KEY,
                title       TEXT,
                file_name   TEXT,
                doc_id      TEXT,
                kind        TEXT DEFAULT 'document',
                created_at  TEXT
            )
            """
        )
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL,
                role        TEXT,
                content     TEXT,
                created_at  TEXT
            )
            """
        )
        _conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
        _conn.commit()


def _migrate_legacy_json():
    """Import any old sessions/*.json files into the DB once (if DB is empty)."""
    with _lock:
        count = _conn.execute("SELECT COUNT(*) AS n FROM sessions").fetchone()["n"]
    if count > 0 or not os.path.isdir(LEGACY_DIR):
        return

    for fname in os.listdir(LEGACY_DIR):
        if not fname.endswith(".json"):
            continue
        sid = fname[:-5]
        try:
            with open(os.path.join(LEGACY_DIR, fname), encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        with _lock:
            _conn.execute(
                "INSERT OR IGNORE INTO sessions(session_id, title, file_name, doc_id, kind, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (sid, data.get("title"), data.get("file_name"), data.get("doc_id"),
                 data.get("kind"), str(data.get("created_at") or "")),
            )
            for m in data.get("messages", []):
                _conn.execute(
                    "INSERT INTO messages(session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                    (sid, m.get("role"), m.get("content"), ""),
                )
            _conn.commit()


_init_db()
_migrate_legacy_json()


# ===================== PUBLIC API (unchanged signatures) =====================

def session_exists(session_id: str) -> bool:
    with _lock:
        row = _conn.execute("SELECT 1 FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    return row is not None


def create_session(session_id: str, file_name: str, doc_id: str = None, kind: str = "document"):
    # `kind` keeps document-chat and data-dashboard-chat histories separate.
    with _lock:
        _conn.execute(
            "INSERT OR IGNORE INTO sessions(session_id, title, file_name, doc_id, kind, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, None, file_name, doc_id, kind, _now()),
        )
        _conn.commit()


def set_doc_id(session_id: str, doc_id: str):
    if not doc_id:
        return
    with _lock:
        _conn.execute("UPDATE sessions SET doc_id = ? WHERE session_id = ?", (doc_id, session_id))
        _conn.commit()


def set_title(session_id: str, title: str):
    with _lock:
        _conn.execute("UPDATE sessions SET title = ? WHERE session_id = ?", (title, session_id))
        _conn.commit()


def add_message(session_id: str, role: str, content: str):
    with _lock:
        exists = _conn.execute("SELECT 1 FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not exists:
            return
        _conn.execute(
            "INSERT INTO messages(session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, _now()),
        )
        _conn.commit()


def get_history(session_id: str):
    with _lock:
        rows = _conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id", (session_id,)
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def get_sessions(kind: str = None):
    with _lock:
        if kind is None:
            rows = _conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
        else:
            rows = _conn.execute(
                "SELECT * FROM sessions WHERE kind = ? ORDER BY created_at DESC", (kind,)
            ).fetchall()
    return [
        {
            "session_id": r["session_id"],
            "title": r["title"],
            "file_name": r["file_name"],
            "doc_id": r["doc_id"],
            "kind": r["kind"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def get_session(session_id: str):
    with _lock:
        s = _conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not s:
            return None
        rows = _conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id", (session_id,)
        ).fetchall()
    return {
        "session_id": s["session_id"],
        "title": s["title"],
        "file_name": s["file_name"],
        "doc_id": s["doc_id"],
        "kind": s["kind"],
        "created_at": s["created_at"],
        "messages": [{"role": r["role"], "content": r["content"]} for r in rows],
    }


def delete_session(session_id: str):
    with _lock:
        _conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        _conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        _conn.commit()
