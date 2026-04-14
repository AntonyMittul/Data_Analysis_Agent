from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_community.document_loaders import PyPDFLoader
import uuid
import os

from app.rag.pipeline import rag_pipeline_stream
from app.rag.ingestion import process_document
from app.rag.vector_store import get_db

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ================= REQUEST MODEL =================

class QueryRequest(BaseModel):
    doc_id: str
    question: str


# ================= BACKGROUND PROCESS =================

def process_document_async(file_path: str, doc_id: str):
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        process_document(documents, doc_id)

        print(f"[SUCCESS] Document processed: {doc_id}")

    except Exception as e:
        print(f"[ERROR] Processing failed for {doc_id}: {e}")


# ================= UPLOAD (OPTIMIZED) =================

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):

    try:
        doc_id = str(uuid.uuid4())

        file_path = os.path.join(UPLOAD_DIR, file.filename)

        # 🔥 FAST FILE WRITE (no processing here)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 🔥 BACKGROUND PROCESSING
        background_tasks.add_task(process_document_async, file_path, doc_id)

        # ⚡ RETURN IMMEDIATELY
        return {
            "doc_id": doc_id,
            "file_name": file.filename,
            "status": "processing"
        }

    except Exception as e:
        print(f"[UPLOAD ERROR]: {e}")
        return {
            "error": "Upload failed"
        }


# ================= QUERY =================

@router.post("/query")
async def query_document(request: QueryRequest):

    generator = rag_pipeline_stream(
        request.doc_id,
        request.question
    )

    return StreamingResponse(generator, media_type="text/plain")


# ================= STATUS CHECK (OPTIONAL BUT USEFUL) =================

@router.get("/status/{doc_id}")
def check_status(doc_id: str):

    db = get_db(doc_id)

    return {
        "ready": db is not None
    }


# ================= HEALTH =================

@router.get("/health")
def health():
    return {"status": "ok"}