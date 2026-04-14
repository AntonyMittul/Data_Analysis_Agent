from app.rag.business_prompt import build_business_prompt
from langchain_ollama import OllamaLLM

llm = OllamaLLM(
    model="phi3",
    temperature=0,
    top_k=1,
    repeat_penalty=1.0,
    num_ctx=4096,
    num_thread=4
)

async def generate_answer_stream(context: str, question: str):
    prompt = build_business_prompt(context, question)
    try:
        async for chunk in llm.astream(prompt):
            yield chunk
    except Exception as e:
        yield f"⚠️ Streaming error: {str(e)}"

