from app.rag.vector_store import get_db
from langchain_community.retrievers import BM25Retriever
import asyncio

bm25_retrievers = {}
hybrid_retrievers = {}


def _get_single_retriever(doc_id):
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


def get_retriever(doc_ids_str):
    if not doc_ids_str:
        return None
        
    doc_ids = [d.strip() for d in doc_ids_str.split(",") if d.strip()]
    if not doc_ids:
        return None
        
    if len(doc_ids) == 1:
        return _get_single_retriever(doc_ids[0])
        
    retrievers = [_get_single_retriever(did) for did in doc_ids]
    retrievers = [r for r in retrievers if r is not None]
    
    if not retrievers:
        return None
        
    if len(retrievers) == 1:
        return retrievers[0]
        
    class MultiHybridRetriever:
        def __init__(self, retrievers):
            self.retrievers = retrievers
            self.k = 6
            
        def set_k(self, k: int):
            self.k = max(1, k)
            for r in self.retrievers:
                r.set_k(self.k)
                
        async def ainvoke(self, query):
            # Gather all results concurrently
            tasks = [r.ainvoke(query) for r in self.retrievers]
            results_list = await asyncio.gather(*tasks)
            
            # Simple round-robin or rank-based merge
            # We can merge them by assigning a new score based on their local rank
            scores = {}
            seen = set()
            ranked = []
            merged = []
            
            for results in results_list:
                merged.extend(results)
                for rank, doc in enumerate(results, start=1):
                    key = doc.page_content
                    # Accumulate score based on rank in individual documents
                    scores[key] = scores.get(key, 0.0) + (1.0 / rank)
                    
            for doc in sorted(merged, key=lambda d: scores.get(d.page_content, 0.0), reverse=True):
                if doc.page_content not in seen:
                    seen.add(doc.page_content)
                    ranked.append(doc)
                    
            return ranked[:self.k]
            
    return MultiHybridRetriever(retrievers)
