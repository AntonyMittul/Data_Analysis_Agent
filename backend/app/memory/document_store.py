"""Metadata for uploaded documents (a record of what's been processed).

One row per uploaded file: its name, type, size, how many pages/sheets it had
and how many chunks were indexed. Stored in the same SQLite database (chat.db).
"""
from datetime import datetime

from app.memory.db import conn, lock


def _init():
    with lock:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                doc_id      TEXT PRIMARY KEY,
                file_name   TEXT,
                file_type   TEXT,
                size_kb     REAL,
                pages       INTEGER,
                chunks      INTEGER,
                created_at  TEXT
            )
            """
        )
        conn.commit()


_init()


def record_document(doc_id, file_name, file_type, size_kb=0.0, pages=0, chunks=0):
    with lock:
        conn.execute(
            "INSERT OR REPLACE INTO documents(doc_id, file_name, file_type, size_kb, pages, chunks, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (doc_id, file_name, file_type, round(float(size_kb), 1), int(pages), int(chunks), datetime.now().isoformat()),
        )
        conn.commit()


def list_documents():
    with lock:
        rows = conn.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_document(doc_id):
    with lock:
        row = conn.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,)).fetchone()
    return dict(row) if row else None


def delete_document(doc_id):
    with lock:
        conn.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))
        conn.commit()
