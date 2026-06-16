from app.rag.retriever import get_retriever
from app.rag.generator import generate_answer_stream
from app.rag.vector_store import get_db
from app.memory.chat_memory import create_session, add_message, set_title, get_history, get_sessions, session_exists, set_doc_id
import uuid

# ================= HELPERS =================

GREETINGS = {"hi", "hii", "hey", "hello", "helo", "yo", "hi there", "hello there",
             "good morning", "good afternoon", "good evening"}
THANKS = ("thank you", "thanks", "thank u", "thx", "ty", "appreciate")
FAREWELLS = {"bye", "goodbye", "good bye", "see you", "see ya", "that's all",
             "thats all", "ok bye", "okay bye", "no thanks"}


def generate_chat_title(first_message: str):
    if len(first_message) > 40:
        return first_message[:37] + "..."
    return first_message.strip().capitalize()


def detect_intent(question: str):
    """Lightweight small-talk detection. Everything else is a real question."""
    q = question.lower().strip().rstrip("!.?")

    if q in GREETINGS:
        return "greeting"
    if any(t in q for t in THANKS) and len(q) <= 30:
        return "thanks"
    if q in FAREWELLS:
        return "bye"
    return "qa"


def _format_history(messages, max_turns: int = 6):
    """Render the last few turns so the assistant can answer follow-ups."""
    recent = messages[-max_turns:]
    lines = []
    for m in recent:
        role = "User" if m.get("role") == "user" else "Assistant"
        content = (m.get("content") or "").strip()
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines)


# ================= MAIN PIPELINE =================

async def rag_pipeline_stream(doc_id, question, session_id=None, file_name=None):
    db = get_db(doc_id)
    has_document = db is not None
    intent = detect_intent(question)

    # ---- SESSION MANAGEMENT ----
    # Each chat has its own session_id (so one document can host several chats,
    # and a chat can outlive a single document). Fall back to doc_id for
    # backward compatibility, then to a fresh id.
    session_id = session_id or doc_id or str(uuid.uuid4())
    if not session_exists(session_id):
        create_session(session_id, file_name=file_name or "New chat", doc_id=doc_id, kind="document")
        set_title(session_id, generate_chat_title(question))
    elif doc_id:
        # Keep the chat pointed at the most recently used document.
        set_doc_id(session_id, doc_id)

    # Snapshot history BEFORE adding the current turn, then record the question.
    history = _format_history(get_history(session_id))
    add_message(session_id, "user", question)

    # ---- SMALL TALK (instant, no LLM/retrieval needed) ----
    if intent == "greeting":
        response = ("Hello! I'm your sales, finance, and business assistant. "
                    "Ask me anything about your uploaded document — or about business, "
                    "finance, or sales in general.")
        add_message(session_id, "assistant", response)
        yield response
        return

    if intent == "thanks":
        response = "You're welcome! Happy to help — feel free to ask anything else about your document or business topics."
        add_message(session_id, "assistant", response)
        yield response
        return

    if intent == "bye":
        response = "Goodbye! Come back anytime you need insights from your documents or business guidance."
        add_message(session_id, "assistant", response)
        yield response
        return

    # ---- RETRIEVE DOCUMENT CONTEXT (may be empty) ----
    context = ""
    if has_document:
        retriever = get_retriever(doc_id)
        if retriever:
            if hasattr(retriever, "set_k"):
                is_broad = any(k in question.lower()
                               for k in ["summary", "summarize", "overview", "contents", "topics"])
                retriever.set_k(8 if is_broad else 6)

            docs = await retriever.ainvoke(question)
            docs = [d for d in docs if len(d.page_content.strip()) > 50]

            MAX_CHUNKS, MAX_CONTEXT_TOKENS = 6, 1400
            selected, total = [], 0
            for d in docs:
                est = d.metadata.get("token_estimate", max(1, len(d.page_content) // 4))
                if total + est > MAX_CONTEXT_TOKENS:
                    break
                selected.append(d)
                total += est
                if len(selected) >= MAX_CHUNKS:
                    break

            context = "\n\n==========\n\n".join(
                f"Page {d.metadata.get('page', 'N/A')}:\n\n{d.page_content.strip()}"
                for d in selected
            )

    # ---- STREAM ANSWER (document-first, expert fallback when context is empty) ----
    full_response = ""
    async for chunk in generate_answer_stream(context, question, history):
        full_response += chunk
        yield chunk
    add_message(session_id, "assistant", full_response)

# ================= API ENDPOINTS =================

def list_sessions():
    return get_sessions()

def get_session_history(session_id: str):
    return get_history(session_id)
