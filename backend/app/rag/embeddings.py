from langchain_community.embeddings import HuggingFaceEmbeddings

_EMBEDDINGS = None


def get_embeddings():
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        _EMBEDDINGS = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"  # ⚡ faster
        )
    return _EMBEDDINGS
