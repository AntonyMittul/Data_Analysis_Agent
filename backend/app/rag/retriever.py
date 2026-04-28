from app.rag.vector_store import get_db
from langchain_community.retrievers import BM25Retriever

bm25_retrievers = {}
hybrid_retrievers = {}


def get_retriever(doc_id):
    if doc_id in hybrid_retrievers:
        return hybrid_retrievers[doc_id]

    db = get_db(doc_id)
    if not db:
        return None

    if doc_id not in bm25_retrievers:
        docs = list(db.docstore._dict.values())
        bm25_retrievers[doc_id] = BM25Retriever.from_documents(docs)

    bm25 = bm25_retrievers[doc_id]
    default_k = 6
    bm25.k = default_k
    vector_retriever = db.as_retriever(search_kwargs={"k": default_k})


    class HybridRetriever:
        def __init__(self):
            self.k = default_k

        def set_k(self, k: int):
            self.k = max(1, k)
            bm25.k = self.k
            vector_retriever.search_kwargs["k"] = self.k

        async def ainvoke(self, query):
            bm25_docs = bm25.invoke(query)
            vector_docs = await vector_retriever.ainvoke(query)

            # Score fusion by rank to prioritize docs relevant in both retrievers
            scores = {}

            for rank, doc in enumerate(bm25_docs, start=1):
                key = doc.page_content
                scores[key] = scores.get(key, 0.0) + (1.0 / rank)

            for rank, doc in enumerate(vector_docs, start=1):
                key = doc.page_content
                scores[key] = scores.get(key, 0.0) + (0.9 / rank)

            # Sort by score, deduplicate
            seen = set()
            ranked = []
            merged = bm25_docs + vector_docs
            for doc in sorted(merged, key=lambda d: scores.get(d.page_content, 0.0), reverse=True):
                if doc.page_content not in seen:
                    seen.add(doc.page_content)
                    ranked.append(doc)

            return ranked[:self.k]

    retriever = HybridRetriever()
    hybrid_retrievers[doc_id] = retriever
    return retriever
