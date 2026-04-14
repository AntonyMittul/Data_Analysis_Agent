from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.agents.unstructured_agent import answer_question
from app.agents.data_assistant_agent import stream_data_answer
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    file_name: str
    session_id: str
    context: Dict[str, Any] = {}

class UnstructuredChatRequest(BaseModel):
    question: str
    file_name: str
    session_id: str

# 1. Wrapping async generators in a StreamingResponse with 'text/event-stream' ensures 
# the front end immediately starts receiving your yielding status messages.

@router.post("/chat/unstructured")
async def chat_unstructured(req: UnstructuredChatRequest):
    return StreamingResponse(
        answer_question(req.question, req.file_name, req.session_id),
        media_type="text/event-stream"
    )

@router.post("/chat/structured")
async def chat_structured(req: ChatRequest):
    return StreamingResponse(
        stream_data_answer(req.question, req.file_name, req.session_id, req.context),
        media_type="text/event-stream"
    )