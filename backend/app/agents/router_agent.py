import os


def route_file(file_path):

    extension = file_path.split(".")[-1].lower()

    structured_types = ["csv", "xlsx"]
    document_types = ["pdf", "docx"]

    if extension in structured_types:
        return "structured"

    if extension in document_types:
        return "unstructured"

    raise ValueError("Unsupported file type")