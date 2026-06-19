from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.upload_routes import router as upload_router
from app.routes.document_routes import router as document_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.chat_routes import router as chat_router
from app.routes.data_chat_routes import router as data_chat_router
from app.routes.eval_routes import router as eval_router



app = FastAPI(title="DataSense AI")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


app.include_router(upload_router)
app.include_router(document_router)
app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(data_chat_router, prefix="/data-chat")
app.include_router(eval_router)


from app.config import settings


@app.get("/")
def root():
    # Diagnostic: confirms which model the LIVE backend is actually using.
    return {
        "message": "Backend running",
        "model": settings.GEMINI_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "google_api_key_set": bool(settings.GOOGLE_API_KEY),
    }