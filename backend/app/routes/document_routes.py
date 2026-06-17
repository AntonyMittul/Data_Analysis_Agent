from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import uuid
import os
import shutil

from app.rag.pipeline import rag_pipeline_stream
from app.rag.ingestion import process_document
from app.rag.vector_store import get_db
from app.rag.loaders import load_document, is_supported, SUPPORTED_DOC_EXTENSIONS
from app.memory.chat_memory import get_sessions, get_session, delete_session
from app.memory.document_store import record_document, list_documents, delete_document

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ================= REQUEST MODEL =================

class QueryRequest(BaseModel):
    doc_id: str = ""
    question: str
    session_id: str | None = None
    file_name: str | None = None


# ================= BACKGROUND PROCESS =================

def index_document(file_path: str, doc_id: str) -> bool:
    """Load, chunk and embed a file, then record its metadata. Returns True on success."""
    try:
        documents = load_document(file_path)
        if not documents:
            print(f"[ERROR] No content extracted from {file_path}")
            return False

        chunks = process_document(documents, doc_id)

        # Save a record of this upload in the database.
        try:
            record_document(
                doc_id=doc_id,
                file_name=os.path.basename(file_path),
                file_type=os.path.splitext(file_path)[1].lstrip(".").lower(),
                size_kb=os.path.getsize(file_path) / 1024,
                pages=len(documents),
                chunks=chunks,
            )
        except Exception as meta_err:
            print(f"[WARN] Could not record document metadata: {meta_err}")

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
        request.question,
        request.session_id,
        request.file_name,
    )

    return StreamingResponse(generator, media_type="text/plain")


# ================= SAMPLE DOCUMENTS =================

SAMPLE_DOCS = {"company_policy.txt", "q3_business_review.txt"}


class SampleRequest(BaseModel):
    name: str


@router.post("/use-sample")
async def use_sample_document(req: SampleRequest):
    if req.name not in SAMPLE_DOCS:
        return {"error": "Unknown sample document."}

    src = os.path.join("samples", req.name)
    if not os.path.exists(src):
        return {"error": "Sample document not found on the server."}

    # Copy into uploads/ so the in-app viewer can render it, then index.
    dest = os.path.join(UPLOAD_DIR, req.name)
    try:
        shutil.copyfile(src, dest)
    except Exception as e:
        print(f"[SAMPLE COPY ERROR]: {e}")
        return {"error": "Could not load the sample document."}

    doc_id = str(uuid.uuid4())
    ok = await run_in_threadpool(index_document, dest, doc_id)
    if not ok:
        return {"error": "Could not index the sample document."}

    return {"doc_id": doc_id, "file_name": req.name, "status": "ready"}


# ================= CHAT SESSIONS (sidebar) =================

@router.get("/sessions")
def list_chat_sessions():
    # Only document-intelligence chats — never the data-dashboard ones.
    return {"sessions": get_sessions(kind="document")}


@router.get("/sessions/{session_id}")
def get_chat_session(session_id: str):
    s = get_session(session_id)
    if not s or s.get("kind") != "document":
        return {"error": "Session not found"}
    return {
        "session_id": session_id,
        "title": s.get("title"),
        "file_name": s.get("file_name"),
        "doc_id": s.get("doc_id"),
        "messages": s.get("messages", []),
    }


@router.delete("/sessions/{session_id}")
def remove_chat_session(session_id: str):
    delete_session(session_id)
    return {"ok": True}


# ================= DOCUMENT LIBRARY (upload history) =================

@router.get("/library")
def document_library():
    return {"documents": list_documents()}


@router.delete("/library/{doc_id}")
def remove_document(doc_id: str):
    delete_document(doc_id)
    return {"ok": True}


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