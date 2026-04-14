from langchain_ollama import OllamaLLM
from app.config.settings import OLLAMA_MODEL

llm = OllamaLLM(model=OLLAMA_MODEL)

def rewrite_query(question: str):

    prompt = f"""
You are an AI search assistant.

Rewrite the user question into an optimized search query
for retrieving information from a document.

Original Question:
{question}

Improved Search Query:
"""

    rewritten = llm.invoke(prompt)

    return rewritten.strip()