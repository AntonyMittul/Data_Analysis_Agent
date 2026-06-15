from app.rag.business_prompt import build_business_prompt
from app.config.llm import get_llm

llm = get_llm(temperature=0, top_k=1)

async def generate_answer_stream(context: str, question: str):
    prompt = build_business_prompt(context, question)
    try:
        async for chunk in llm.astream(prompt):
            yield chunk
    except Exception as e:
        yield f"⚠️ Streaming error: {str(e)}"
