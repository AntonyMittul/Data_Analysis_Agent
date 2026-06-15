"""Centralized Gemini LLM factory.

Every agent/service builds its LLM through `get_llm()` so the provider,
model name and API key live in exactly one place.

`GoogleGenerativeAI` (the text LLM, not the chat wrapper) is used on purpose:
its `.invoke()` returns a plain string and `.astream()` yields plain strings,
which is a drop-in match for how the rest of the codebase consumes the model.
"""
from langchain_google_genai import GoogleGenerativeAI

from app.config.settings import GEMINI_MODEL, GOOGLE_API_KEY


def get_llm(
    temperature: float = 0.0,
    max_output_tokens: int | None = None,
    top_p: float | None = None,
    top_k: int | None = None,
):
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. Create backend/.env from backend/.env.example "
            "and paste your Gemini API key into it."
        )

    kwargs = {
        "model": GEMINI_MODEL,
        "google_api_key": GOOGLE_API_KEY,
        "temperature": temperature,
    }
    if max_output_tokens is not None:
        kwargs["max_output_tokens"] = max_output_tokens
    if top_p is not None:
        kwargs["top_p"] = top_p
    if top_k is not None:
        kwargs["top_k"] = top_k

    return GoogleGenerativeAI(**kwargs)
