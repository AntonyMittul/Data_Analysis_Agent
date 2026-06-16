from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import uuid
import os

from app.rag.pipeline import rag_pipeline_stream
from app.rag.ingestion import process_document
from app.rag.vector_store import get_db
from app.rag.loaders import load_document, is_supported, SUPPORTED_DOC_EXTENSIONS

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ================= REQUEST MODEL =================

class QueryRequest(BaseModel):
    doc_id: str
    question: str


# ================= BACKGROUND PROCESS =================

def index_document(file_path: str, doc_id: str) -> bool:
    """Load, chunk and embed a file. Returns True on success."""
    try:
        documents = load_document(file_path)
        if not documents:
            print(f"[ERROR] No content extracted from {file_path}")
            return False

        process_document(documents, doc_id)
        print(f"[SUCCESS] Document processed: {doc_id}")
        return True

    except Exception as e:
        print(f"[ERROR] Processing failed for {doc_id}: {e}")
        return False


# ================= UPLOAD (OPTIMIZED) =================

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):

    try:
        if not is_supported(file.filename or ""):
            allowed = ", ".join(sorted(e.lstrip(".") for e in SUPPORTED_DOC_EXTENSIONS))
            return {"error": f"Unsupported file type. Supported formats: {allowed}."}

        doc_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Index synchronously (in a worker thread) so the file is queryable the
        # moment we respond — no "indexed" claim before it is actually ready.
        ok = await run_in_threadpool(index_document, file_path, doc_id)
        if not ok:
            return {"error": "Could not read or index this file. It may be empty, corrupted, or unsupported."}

        return {
            "doc_id": doc_id,
            "file_name": file.filename,
            "status": "ready"
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