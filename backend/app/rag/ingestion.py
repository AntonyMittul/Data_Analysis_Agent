from app.rag.chunking import chunk_documents
from app.rag.vector_store import store_documents

def process_document(documents, doc_id):

    chunks = chunk_documents(documents)

    store_documents(chunks, doc_id)

    return len(chunks)