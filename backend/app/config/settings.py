import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

DATA_DIR = os.path.join(BASE_DIR, "data")
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector_db")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(VECTOR_DB_DIR, exist_ok=True)

# ================= GEMINI (Google Generative AI) =================
# The whole app runs on a single Google Gemini API key.
# Get one at https://aistudio.google.com/app/apikey and put it in backend/.env
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Chat / generation model
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Embedding model used for the document RAG vector store
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")

# ================= RAG CHUNKING =================
CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
