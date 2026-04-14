from fastapi import APIRouter, UploadFile, File
import os
import shutil

router = APIRouter(prefix="/dataset", tags=["dataset"])

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):

    filename = file.filename.lower()

    if not filename.endswith(".csv") and not filename.endswith(".xlsx"):
        return {
            "error": "Only CSV and XLSX files are supported"
        }

    file_path = os.path.join(DATA_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Dataset uploaded successfully",
        "file_name": file.filename,
        "file_path": file_path
    }