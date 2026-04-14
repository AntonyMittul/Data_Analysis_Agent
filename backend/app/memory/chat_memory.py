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

def create_session(session_id: str, file_name: str):
    chat_sessions[session_id] = {
        "title": None,
        "file_name": file_name,
        "messages": [],
        "created_at": datetime.now()
    }
    _save_session(session_id)

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

def get_sessions():
    return [
        {
            "session_id": sid,
            "title": data["title"],
            "file_name": data["file_name"]
        }
        for sid, data in chat_sessions.items()
    ]

def set_title(session_id: str, title: str):
    if session_id in chat_sessions:
        chat_sessions[session_id]["title"] = title
        _save_session(session_id)