"""Single shared SQLite connection for the whole app.

Everything that needs the database (chat history, document metadata) imports
`conn` and `lock` from here, so there is exactly one connection to one file
(chat.db). The lock serializes writes so concurrent requests stay safe.
"""
import os
import sqlite3
import threading

DB_PATH = os.getenv("CHAT_DB_PATH", "chat.db")

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.row_factory = sqlite3.Row

lock = threading.Lock()
