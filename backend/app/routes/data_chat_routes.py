from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.routes.dashboard_routes import dataset_sessions
from app.agents.data_assistant_agent import stream_data_answer

router = APIRouter()


class DataChatRequest(BaseModel):
    question: str
    file_path: str
    session_id: str


@router.post("/query")
async def data_chat(request: DataChatRequest):
    question = request.question
    file_path = request.file_path
    session_id = request.session_id

    # CONTEXT FETCH
    context = dataset_sessions.get(file_path)

    if not context:
        return {"error": "Dataset not analyzed yet"}

    # ENSURE INSIGHTS EXIST
    if not context.get("insights"):
        context["insights"] = "Insights are being generated. You can still ask questions based on charts and data."

    try:
        generator = stream_data_answer(
            question,
            file_path,
            session_id,
            context
        )

        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:
        print(f"[Data Chat Error]: {e}")
        return {"error": "Failed to process query"}
