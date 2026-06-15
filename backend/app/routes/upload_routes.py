from fastapi import APIRouter, UploadFile, File
import os
import shutil

router = APIRouter()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)


@router.post("/upload/")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a structured dataset (CSV / XLSX).

    Documents (PDF / DOCX) are handled by the dedicated /documents/upload
    endpoint, which runs the RAG ingestion pipeline.
    """
    filename = (file.filename or "").lower()

    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        return {
            "error": "Only CSV and XLSX files are supported on this endpoint. "
                     "Use /documents/upload for PDF or DOCX files."
        }

    file_path = os.path.join(DATA_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Dataset uploaded successfully",
        "file_name": file.filename,
        "file_path": file_path,
    }
