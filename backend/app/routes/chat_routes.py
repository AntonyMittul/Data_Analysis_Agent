from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.unstructured_agent import answer_question
from app.memory.chat_memory import get_sessions, get_history

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    file_name: str
    session_id: str


@router.post("/chat")
async def chat(request: ChatRequest):

    return StreamingResponse(
        answer_question(
            request.question,
            request.file_name,
            request.session_id
        ),
        media_type="text/plain"
    )



