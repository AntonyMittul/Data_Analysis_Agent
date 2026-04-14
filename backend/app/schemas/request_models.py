from pydantic import BaseModel


class QueryRequest(BaseModel):
    question: str
    file_name: str
    session_id: str