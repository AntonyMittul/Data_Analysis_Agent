from app.rag.retriever import get_retriever
from app.rag.generator import generate_answer_stream
from app.rag.vector_store import get_db
from app.memory.chat_memory import create_session, add_message, set_title, get_history, get_sessions, chat_sessions
import uuid

# ================= HELPER =================

def generate_chat_title(first_message: str):
    if len(first_message) > 40:
        return first_message[:37] + "..."
    return first_message.strip().capitalize()

def detect_intent(question: str, has_document: bool):
    q = question.lower().strip()

    if q in ["hi", "hello", "hey"]:
        return "chat"

    if not has_document:
        return "general"

    if any(k in q for k in ["summary", "summarize", "overview", "contents", "report", "topics"]):
        return "structured"

    return "rag"

# ================= MAIN PIPELINE =================

async def rag_pipeline_stream(doc_id, question):
    db = get_db(doc_id)
    has_document = db is not None
    intent = detect_intent(question, has_document)

    # ---- SESSION MANAGEMENT ----
    session_id = doc_id or str(uuid.uuid4())
    if session_id not in chat_sessions:
        create_session(session_id, file_name="uploaded_doc.pdf")
        set_title(session_id, generate_chat_title(question))

    # Save user message
    add_message(session_id, "user", question)

    # ---- CHAT MODE ----
    if intent == "chat":
        response = "Hello! How can I help you today?\n\n"
        add_message(session_id, "assistant", response)
        yield response
        return

    # ---- GENERAL MODE ----
    if intent == "general":
        full_response = ""
        async for chunk in generate_answer_stream("", question):
            full_response += chunk
            yield chunk
        add_message(session_id, "assistant", full_response)
        return

    # ---- DOCUMENT REQUIRED BUT MISSING ----
    if not has_document:
        response = "Please upload a document to answer this question."
        add_message(session_id, "assistant", response)
        yield response
        return

    # ---- RETRIEVER ----
    retriever = get_retriever(doc_id)
    if not retriever:
        full_response = ""
        async for chunk in generate_answer_stream("", question):
            full_response += chunk
            yield chunk
        add_message(session_id, "assistant", full_response)
        return

    if hasattr(retriever, "set_k"):
        retriever.set_k(8 if intent == "structured" else 6)

    # ---- RETRIEVE DOCS ----
    docs = await retriever.ainvoke(question)
    docs = [d for d in docs if len(d.page_content.strip()) > 50]

    if not docs:
        full_response = ""
        async for chunk in generate_answer_stream("", question):
            full_response += chunk
            yield chunk
        add_message(session_id, "assistant", full_response)
        return

    # ---- LIMIT CONTEXT ----
    MAX_CHUNKS = 6
    MAX_CONTEXT_TOKENS = 1400
    selected_docs, total_tokens = [], 0

    for d in docs:
        content = d.page_content.strip()
        token_estimate = d.metadata.get("token_estimate", max(1, len(content) // 4))
        if total_tokens + token_estimate > MAX_CONTEXT_TOKENS:
            break
        selected_docs.append(d)
        total_tokens += token_estimate
        if len(selected_docs) >= MAX_CHUNKS:
            break

    # ---- BUILD CONTEXT ----
    context = "\n\n==========\n\n".join(
        f"Page {d.metadata.get('page','N/A')}:\n\n{d.page_content.strip()}"
        for d in selected_docs
    )

    # ---- STREAM ANSWER ----
    full_response = ""
    async for chunk in generate_answer_stream(context, question):
        full_response += chunk
        yield chunk
    add_message(session_id, "assistant", full_response)

# ================= API ENDPOINTS =================

def list_sessions():
    return get_sessions()

def get_session_history(session_id: str):
    return get_history(session_id)
