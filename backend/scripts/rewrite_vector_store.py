from pathlib import Path

path = Path(__file__).parents[1] / "app" / "rag" / "vector_store.py"

path.write_text(
    """from langchain_community.vectorstores import Chroma
from app.rag.embeddings import get_embeddings


def store_vectors(chunks, file_name: str):

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory=\"vector_db\",
        collection_name=file_name
    )

    # Ensure the persisted collection is written to disk for retrieval
    try:
        vectorstore.persist()
    except Exception:
        pass

    print(f\"Stored {len(chunks)} chunks for:\", file_name)
"""
)
print(f"Wrote {path}")
