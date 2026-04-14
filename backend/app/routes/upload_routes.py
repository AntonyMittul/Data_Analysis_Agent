from fastapi import APIRouter, UploadFile, File, BackgroundTasks
import os
import shutil

from app.utils.helpers import save_uploaded_file
from app.rag.ingestion import process_document
from app.rag.chunking import chunk_documents
from app.rag.vector_store import store_documents

router = APIRouter()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)


def process_document(file_path: str, file_name: str):
    """
    Runs document indexing in the background
    so upload API returns instantly.
    """

    # Check if already processed
    from langchain_community.vectorstores import Chroma
    from app.rag.embeddings import get_embeddings

    try:
        vectorstore = Chroma(
            persist_directory="vector_db",
            embedding_function=get_embeddings(),
            collection_name=file_name
        )
        if vectorstore._collection.count() > 0:
            print(f"Document {file_name} already processed, skipping.")
            return
    except:
        pass  # If error, proceed to process

    documents = process_document(file_path)

    chunks = chunk_documents(documents)

    store_documents(chunks, file_name)

    # initialize BM25 once
    from app.rag.retriever import bm25_retrievers
    from langchain_community.retrievers import BM25Retriever

    bm25 = BM25Retriever.from_documents(chunks)
    bm25.k = 3
    bm25_retrievers[file_name] = bm25

    print(f"Stored {len(chunks)} chunks for:", file_name)


@router.post("/upload/")
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):

    filename = file.filename.lower()

    # -----------------------------
    # CSV / XLSX DATASET
    # -----------------------------
    if filename.endswith(".csv") or filename.endswith(".xlsx"):

        file_path = os.path.join(DATA_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "message": "Dataset uploaded successfully",
            "file_name": file.filename,
            "file_path": file_path
        }

    # -----------------------------
    # DOCUMENT (PDF / DOCX)
    # -----------------------------
    file_path = save_uploaded_file(file)

    # Run indexing in background
    background_tasks.add_task(process_document, file_path, file.filename)

    return {
        "message": "Document uploaded successfully. Indexing in progress.",
        "file_name": file.filename
    }