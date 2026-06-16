from app.rag.business_prompt import build_business_prompt
from app.config.llm import get_llm

# Slight warmth so the expert/advisor fallback reads naturally, while staying
# grounded enough to quote document figures accurately.
llm = get_llm(temperature=0.2)

async def generate_answer_stream(context: str, question: str, history: str = ""):
    prompt = build_business_prompt(context, question, history)
    try:
        async for chunk in llm.astream(prompt):
            yield chunk
    except Exception as e:
        yield f"⚠️ Streaming error: {str(e)}"
