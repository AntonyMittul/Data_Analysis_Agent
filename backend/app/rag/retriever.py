from app.rag.vector_store import get_db
from langchain_community.retrievers import BM25Retriever

def get_retriever(doc_id):
    db = get_db(doc_id)
    if not db:
        return None

    docs = list(db.docstore._dict.values())
    bm25 = BM25Retriever.from_documents(docs)
    bm25.k = 6
    vector_retriever = db.as_retriever(search_kwargs={"k": 10})


    class HybridRetriever:
        async def ainvoke(self, query):
            bm25_docs = bm25.invoke(query)
            vector_docs = await vector_retriever.ainvoke(query)

            # Assign scores (BM25 stronger for keywords, vectors for semantics)
            scored = [(doc, 1.0) for doc in bm25_docs] + [(doc, 0.8) for doc in vector_docs]

            # Sort by score, deduplicate
            seen = set()
            ranked = []
            for doc, score in sorted(scored, key=lambda x: x[1], reverse=True):
                if doc.page_content not in seen:
                    seen.add(doc.page_content)
                    ranked.append(doc)

            return ranked[:6]  # 🔥 fewer, higher-quality chunks

    return HybridRetriever()
