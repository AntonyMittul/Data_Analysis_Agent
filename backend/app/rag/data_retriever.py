from langchain_community.vectorstores import Chroma
from app.rag.embeddings import get_embeddings
from typing import List, Dict, Any
import json

# In-memory cache for data vector stores
data_vectorstores = {}


def create_data_chunks(profile: Dict, charts: List[Dict], insights: str) -> List[str]:
    """Create text chunks from dataset information for retrieval"""

    chunks = []

    # Profile chunk
    profile_text = f"""
Dataset Profile:
- Rows: {profile.get('rows', 'Unknown')}
- Columns: {profile.get('columns', 'Unknown')}
- Numeric Columns: {', '.join(profile.get('numeric_columns', [])[:10])}
- Categorical Columns: {', '.join(profile.get('categorical_columns', [])[:10])}
- Summary Statistics: {json.dumps(profile.get('summary_stats', {}), indent=2)}
"""
    chunks.append(profile_text)

    # Chart descriptions
    for i, chart in enumerate(charts):
        chart_text = f"""
Chart {i+1}: {chart.get('title', 'Unnamed Chart')}
This chart visualizes data relationships and patterns in the dataset.
Chart type and data provide insights into trends, comparisons, correlations, or distributions.
"""
        chunks.append(chart_text)

    # Insights chunk
    if insights and insights != "Generating insights...":
        insights_text = f"""
Business Insights:
{insights}

These insights provide analysis and recommendations based on the dataset.
"""
        chunks.append(insights_text)

    return chunks


def get_data_retriever(file_path: str, profile: Dict = None, charts: List[Dict] = None, insights: str = None):
    """
    Creates or retrieves a vector retriever for structured data analysis context.
    This includes dataset profile, chart descriptions, and generated insights.
    """
    # Clean the file path to create a valid collection name
    clean_path = file_path.replace('/', '_').replace('\\', '_')
    collection_name = f"data_{clean_path}"
    
    # If retriever is already in the in-memory cache, return it immediately
    if collection_name in data_vectorstores:
        return data_vectorstores[collection_name].as_retriever(search_type="similarity", search_kwargs={"k": 3})

    # Otherwise, load from disk or create a new one
    vectorstore = Chroma(
        persist_directory="vector_db",
        embedding_function=get_embeddings(),
        collection_name=collection_name
    )

    # If the vector store on disk is empty and we have data, populate it.
    # This expensive embedding step will now only run once per file across application restarts.
    if vectorstore._collection.count() == 0 and profile and charts is not None:
        chunks = create_data_chunks(profile, charts, insights or "")
        if chunks:
            vectorstore.add_texts(chunks)
            vectorstore.persist()

    data_vectorstores[collection_name] = vectorstore
    return vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})

    return None