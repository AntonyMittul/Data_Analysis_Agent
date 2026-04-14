import os

STRUCTURED_TYPES = ["csv", "xlsx"]
UNSTRUCTURED_TYPES = ["pdf", "docx"]


def validate_file(filename: str):

    extension = filename.split(".")[-1].lower()

    if extension in STRUCTURED_TYPES:
        return "structured"

    if extension in UNSTRUCTURED_TYPES:
        return "unstructured"

    raise ValueError("Unsupported file type")