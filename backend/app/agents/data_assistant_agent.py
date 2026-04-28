from langchain_ollama import OllamaLLM
from app.memory.chat_memory import (
    get_history,
    add_message,
    set_title,
    create_session
)
from app.services.insight_generator import summarize_charts
from app.services.dashboard_retriever import retrieve_dashboard_context
from cachetools import LRUCache
from app.config.settings import OLLAMA_MODEL
import asyncio

# ================= CACHE =================
response_cache = LRUCache(maxsize=100)

# ================= LLM =================
llm = OllamaLLM(
    model=OLLAMA_MODEL,
    temperature=0,
    num_ctx=1024
)

def get_cache_key(question, file_path):
    return f"{file_path}:{question.strip().lower()}"

# ================= MAIN FUNCTION =================
async def stream_data_answer(question: str, file_path: str, session_id: str, context: dict):

    cache_key = get_cache_key(question, file_path)

    # ================= CACHE HIT =================
    if cache_key in response_cache:
        yield response_cache[cache_key]
        return

    # ================= SESSION =================
    history = get_history(session_id)

    if len(history) == 0:
        create_session(session_id, file_path)
        set_title(session_id, question[:60])

    add_message(session_id, "user", question)

    # ================= NEW CONTEXT =================

    structured_context = context.get("context", {})
    llm_context = structured_context.get("llm_context", "")

    charts = context.get("charts", [])
    chart_summary = summarize_charts(charts)

    insights = context.get("insights", "")
    profile = context.get("profile", {})

    retrieved_context = retrieve_dashboard_context(
        question=question,
        profile=profile,
        charts=charts,
        insights=insights,
        k=4
    )

    # ================= FAST PATH =================
    question_lower = question.lower()

    if "column" in question_lower:
        yield f"Columns available: {', '.join(structured_context.get('structured', {}).get('columns', []))}"
        return

    if "row" in question_lower or "size" in question_lower:
        yield f"The dataset contains structured data with multiple records available for analysis."
        return

    if "insight" in question_lower:
        yield insights
        return

    # ================= PROMPT =================
    prompt = f"""
You are an expert business data analyst.

You MUST ONLY use the provided dataset context.
DO NOT assume anything.
DO NOT hallucinate.

================ DATA CONTEXT ================
{llm_context}

================ VISUAL SUMMARY ================
{chart_summary}

================ INSIGHTS ================
{insights}

================ RETRIEVED DASHBOARD CONTEXT ================
{retrieved_context}

================ RULES ================
- The dataset is real and contains valid data
- NEVER say dataset is empty
- NEVER invent columns
- Use actual values from context
- If unsure, say "based on available data"

================ USER QUESTION ================
{question}

Answer clearly and professionally.
"""

    # ================= RESPONSE =================
    full_response = ""

    try:
        # 🔥 INSTANT FEEDBACK (UX FIX)
        yield "Analyzing your data...\n\n"

        try:
            stream = llm.astream(prompt)

            async for chunk in stream:
                if chunk:
                    full_response += chunk
                    yield chunk

        except Exception as e:
            print("[LLM ERROR]:", e)
            yield "\n⚠️ Failed to generate response."
            return

    except asyncio.TimeoutError:
        yield "\n⚠️ Response timed out. Try a simpler question."
        return

    except Exception as e:
        print("[LLM ERROR]:", e)
        yield "\n⚠️ Failed to generate response."
        return

    # 🔥 FINAL FALLBACK
    if not full_response.strip():
        yield "⚠️ I'm having trouble analyzing the data right now. Please try again."
        return

    # ================= STORE =================
    response_cache[cache_key] = full_response
    add_message(session_id, "assistant", full_response)
