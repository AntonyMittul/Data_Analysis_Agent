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
import hashlib
import json

# ================= CACHE =================
response_cache = LRUCache(maxsize=100)

# ================= LLM =================
llm = OllamaLLM(
    model=OLLAMA_MODEL,
    temperature=0,
    num_ctx=1024
)


def build_context_signature(context: dict) -> str:
    signature_payload = {
        "profile": context.get("profile", {}),
        "chart_titles": [chart.get("title") for chart in context.get("charts", [])],
        "insights": context.get("insights", ""),
        "data_context": context.get("data_context", {})
    }
    serialized = json.dumps(signature_payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]


def get_cache_key(question, file_path, context_signature=""):
    return f"{file_path}:{context_signature}:{question.strip().lower()}"


def format_data_context(data_context: dict) -> str:
    if not data_context:
        return "No uploaded dataset context was provided."

    compact_context = {
        "row_count": data_context.get("row_count"),
        "column_count": data_context.get("column_count"),
        "columns": data_context.get("columns", []),
        "dtypes": data_context.get("dtypes", {}),
        "sample_rows": data_context.get("sample_rows", [])[:25],
        "summary": data_context.get("summary", {})
    }
    return json.dumps(compact_context, indent=2, default=str)


# ================= MAIN FUNCTION =================
async def stream_data_answer(question: str, file_path: str, session_id: str, context: dict):

    context_signature = build_context_signature(context or {})
    cache_key = get_cache_key(question, file_path, context_signature)

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

    # ================= CONTEXT =================
    structured_context = context.get("context", {})
    llm_context = structured_context.get("llm_context", "")

    charts = context.get("charts", [])
    chart_summary = summarize_charts(charts)

    insights = context.get("insights", "")
    profile = context.get("profile", {})
    data_context = context.get("data_context", {})
    data_context_text = format_data_context(data_context)

    retrieved_context = retrieve_dashboard_context(
        question=question,
        profile=profile,
        charts=charts,
        insights=insights,
        k=4
    )

    # ================= FAST PATH =================
    question_lower = question.lower()
    columns = data_context.get("columns", [])

    if "column" in question_lower:
        if columns:
            yield f"Columns available: {', '.join(columns)}"
        else:
            profile_columns = profile.get("numeric_columns", []) + profile.get("categorical_columns", []) + profile.get("datetime_columns", [])
            yield f"Columns available: {', '.join(profile_columns)}" if profile_columns else "No column metadata is available for this dataset."
        return

    if "row" in question_lower or "size" in question_lower:
        row_count = data_context.get("row_count") or profile.get("rows")
        column_count = data_context.get("column_count") or profile.get("columns")
        if row_count is not None and column_count is not None:
            yield f"The dataset contains {row_count} rows and {column_count} columns."
        else:
            yield "The dataset contains structured records available for analysis."
        return

    if "insight" in question_lower:
        yield insights or "Insights are still being generated. You can ask chart or data questions now."
        return

    # ================= PROMPT =================
    prompt = f"""
You are an expert business data analyst.

You MUST ONLY use the provided uploaded dataset context, generated dashboard visuals, and generated insights.
DO NOT assume anything.
DO NOT hallucinate.

================ UPLOADED DATA CONTEXT ================
{data_context_text}

================ LEGACY DATA CONTEXT ================
{llm_context}

================ VISUAL SUMMARY ================
{chart_summary}

================ INSIGHTS ================
{insights}

================ RETRIEVED DASHBOARD CONTEXT ================
{retrieved_context}

================ RULES ================
- The dataset is real and contains valid data
- NEVER say dataset is empty when uploaded data context is present
- NEVER invent columns
- Use actual column names and values from the uploaded data context
- Use the generated visuals when the question asks about charts, trends, distributions, forecasts, or dashboard patterns
- If unsure, say "based on available data"

================ USER QUESTION ================
{question}

Answer clearly and professionally.
"""

    # ================= RESPONSE =================
    full_response = ""

    try:
        yield "Analyzing your data...\n\n"

        try:
            stream = llm.astream(prompt)

            async for chunk in stream:
                if chunk:
                    full_response += chunk
                    yield chunk

        except Exception as e:
            print("[LLM ERROR]:", e)
            yield "\nFailed to generate response."
            return

    except asyncio.TimeoutError:
        yield "\nResponse timed out. Try a simpler question."
        return

    except Exception as e:
        print("[LLM ERROR]:", e)
        yield "\nFailed to generate response."
        return

    # ================= FINAL FALLBACK =================
    if not full_response.strip():
        yield "I'm having trouble analyzing the data right now. Please try again."
        return

    # ================= STORE =================
    response_cache[cache_key] = full_response
    add_message(session_id, "assistant", full_response)
