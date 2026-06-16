import json
import os
from datetime import datetime

SESSIONS_DIR = "sessions"
os.makedirs(SESSIONS_DIR, exist_ok=True)

chat_sessions = {}

def _load_sessions():
    global chat_sessions
    for file in os.listdir(SESSIONS_DIR):
        if file.endswith('.json'):
            session_id = file[:-5]
            with open(os.path.join(SESSIONS_DIR, file), 'r') as f:
                chat_sessions[session_id] = json.load(f)

def _save_session(session_id):
    with open(os.path.join(SESSIONS_DIR, f"{session_id}.json"), 'w') as f:
        json.dump(chat_sessions[session_id], f, default=str)

_load_sessions()

def create_session(session_id: str, file_name: str, doc_id: str = None, kind: str = "document"):
    # `kind` keeps the document-chat and data-dashboard-chat histories separate
    # even though they share this store ("document" vs "data").
    chat_sessions[session_id] = {
        "title": None,
        "file_name": file_name,
        "doc_id": doc_id,
        "kind": kind,
        "messages": [],
        "created_at": datetime.now().isoformat()
    }
    _save_session(session_id)

def set_doc_id(session_id: str, doc_id: str):
    if session_id in chat_sessions and doc_id:
        chat_sessions[session_id]["doc_id"] = doc_id
        _save_session(session_id)

def get_session(session_id: str):
    return chat_sessions.get(session_id)

def delete_session(session_id: str):
    chat_sessions.pop(session_id, None)
    try:
        os.remove(os.path.join(SESSIONS_DIR, f"{session_id}.json"))
    except OSError:
        pass

def add_message(session_id: str, role: str, content: str):
    if session_id not in chat_sessions:
        return
    chat_sessions[session_id]["messages"].append({
        "role": role,
        "content": content
    })
    _save_session(session_id)

def get_history(session_id: str):
    if session_id not in chat_sessions:
        return []
    return chat_sessions[session_id]["messages"]

def get_sessions(kind: str = None):
    items = [
        {
            "session_id": sid,
            "title": data.get("title"),
            "file_name": data.get("file_name"),
            "doc_id": data.get("doc_id"),
            "kind": data.get("kind", "document"),
            "created_at": data.get("created_at"),
        }
        for sid, data in chat_sessions.items()
        if kind is None or data.get("kind") == kind
    ]
    # Newest first (created_at is an ISO string, which sorts chronologically).
    items.sort(key=lambda s: s.get("created_at") or "", reverse=True)
    return items

def set_title(session_id: str, title: str):
    if session_id in chat_sessions:
        chat_sessions[session_id]["title"] = title
        _save_session(session_id)