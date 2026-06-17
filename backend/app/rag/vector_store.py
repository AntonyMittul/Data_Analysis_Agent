from langchain_community.vectorstores import FAISS
from app.rag.embeddings import get_embeddings
import os

VECTOR_DB_PATH = "vector_db"
db_cache = {}

def store_documents(chunks, doc_id):

    embeddings = get_embeddings()

    # Create folder if not exists
    os.makedirs(VECTOR_DB_PATH, exist_ok=True)

    db = FAISS.from_documents(chunks, embeddings)

    # Save to disk
    path = f"{VECTOR_DB_PATH}/{doc_id}"
    db.save_local(path)
    db_cache[doc_id] = db


def get_db(doc_id):
    if doc_id in db_cache:
        return db_cache[doc_id]

    embeddings = get_embeddings()
    path = f"{VECTOR_DB_PATH}/{doc_id}"

    if not os.path.exists(path):
        return None

    try:
        db = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
        db_cache[doc_id] = db
        return db
    except Exception as e:
        print("[FAISS LOAD ERROR]:", e)
        return None
