from app.memory.chat_memory import (
    get_history,
    add_message,
    set_title,
    create_session
)
from app.rag.retriever import get_retriever
from app.rag.generator import generate_answer_stream

retrieval_cache = {}
response_cache = {}

def is_global_question(question: str) -> bool:
    q = question.lower()
    return any(word in q for word in ["summarize", "summary", "overview", "key points", "main topics"])

async def answer_question(question: str, file_name: str, session_id: str):
    cache_key = f"{file_name}_{question}"
    full_response = ""

    if cache_key in response_cache:
        yield response_cache[cache_key]
        return

    history = get_history(session_id)
    if not history:
        create_session(session_id, file_name)
        set_title(session_id, question[:40])

    add_message(session_id, "user", question)

    # ================= RETRIEVAL =================
    retriever = get_retriever(file_name)
    if not retriever:
        yield "Document not processed. Please upload again."
        return

    # Dynamic K: more context for summaries
    # Dynamic K improvement
    if hasattr(retriever, "set_k"):
        retriever.set_k(12 if is_global_question(question) else 6)

    docs = await retriever.ainvoke(question)
    if not docs:
        yield "The document does not contain relevant information for this query."
        return

    # Sort chunks to maintain document flow
    docs = sorted(docs, key=lambda x: (x.metadata.get("page", 0), x.metadata.get("start_index", 0)))
    context = "\n\n".join([f"[Page {d.metadata.get('page', 'N/A')}]: {d.page_content}" for d in docs])

#     # ================= IMPROVED PROMPT =================
#     prompt = f"""
# You are a highly accurate document assistant.

# RULES:
# - Use ONLY the provided context
# - Be COMPLETE (do not miss sections)
# - Preserve structure (like Day-1, headings, bullets)
# - If listing, include ALL items
# - Do NOT summarize unless asked

# CONTEXT:
# {context}

# QUESTION:
# {question}

# ANSWER:
# """

    async for chunk in generate_answer_stream(context, question):
        full_response += chunk
        yield chunk

    response_cache[cache_key] = full_response
    print(f"[CACHING] Cached response for {cache_key}")
    add_message(session_id, "assistant", full_response)
