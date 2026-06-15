from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config.settings import EMBEDDING_MODEL, GOOGLE_API_KEY

_EMBEDDINGS = None


def get_embeddings():
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        if not GOOGLE_API_KEY:
            raise RuntimeError(
                "GOOGLE_API_KEY is not set. Create backend/.env from backend/.env.example "
                "and paste your Gemini API key into it."
            )
        _EMBEDDINGS = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=GOOGLE_API_KEY,
        )
    return _EMBEDDINGS
