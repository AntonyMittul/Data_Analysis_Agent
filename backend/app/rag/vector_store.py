from langchain_community.vectorstores import FAISS
from app.rag.embeddings import get_embeddings
import os

VECTOR_DB_PATH = "vector_db"

def store_documents(chunks, doc_id):

    embeddings = get_embeddings()

    # 🔥 Create folder if not exists
    os.makedirs(VECTOR_DB_PATH, exist_ok=True)

    db = FAISS.from_documents(chunks, embeddings)

    # 🔥 Save to disk
    db.save_local(f"{VECTOR_DB_PATH}/{doc_id}")


def get_db(doc_id):
    embeddings = get_embeddings()
    path = f"{VECTOR_DB_PATH}/{doc_id}"

    if not os.path.exists(path):
        return None

    try:
        return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    except Exception as e:
        print("[FAISS LOAD ERROR]:", e)
        return None