import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

DATA_DIR = os.path.join(BASE_DIR, "data")
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector_db")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(VECTOR_DB_DIR, exist_ok=True)

OLLAMA_MODEL = "gemma3:4b"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
