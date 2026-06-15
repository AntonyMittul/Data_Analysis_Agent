from app.config.llm import get_llm

llm = get_llm()

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