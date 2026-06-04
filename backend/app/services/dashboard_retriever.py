from typing import Dict, List
import json
import re


def _tokenize(text: str) -> set:
    return set(re.findall(r"[a-zA-Z0-9_]+", (text or "").lower()))


def safe_slice(val, limit=5):
    if val is None:
        return ""
    if isinstance(val, (list, tuple, set)):
        return str(list(val)[:limit])
    if isinstance(val, dict):
        return ""
    try:
        if isinstance(val, str):
            return val[:limit]
        return str(list(val)[:limit])
    except:
        return str(val)


def build_dashboard_chunks(profile: Dict, charts: List[Dict], insights: str) -> List[str]:
    chunks: List[str] = []

    profile_chunk = f"""
Dataset Profile:
- Rows: {profile.get('rows', 'Unknown')}
- Columns: {profile.get('columns', 'Unknown')}
- Numeric Columns: {', '.join(profile.get('numeric_columns', [])[:15])}
- Categorical Columns: {', '.join(profile.get('categorical_columns', [])[:15])}
- Summary Statistics: {json.dumps(profile.get('summary_stats', {}), indent=2)}
"""
    chunks.append(profile_chunk.strip())

    for i, chart in enumerate(charts or []):
        fig = chart.get("figure", {})
        traces = fig.get("data", [])
        chart_type = "Unknown"
        x_values_sample = ""
        y_values_sample = ""
        
        if traces:
            trace = traces[0]
            chart_type = trace.get("type", "Unknown")
            
            # Extract sample data points safely using safe_slice
            if "x" in trace and trace["x"] is not None:
                sample = safe_slice(trace["x"], 5)
                if sample:
                    x_values_sample = f"Sample X Keys: {sample}"
            if "y" in trace and trace["y"] is not None:
                sample = safe_slice(trace["y"], 5)
                if sample:
                    y_values_sample = f"Sample Y Values: {sample}"
            elif "values" in trace and trace["values"] is not None:
                sample = safe_slice(trace["values"], 5)
                if sample:
                    y_values_sample = f"Sample Values: {sample}"

        chart_chunk = f"""
Chart {i + 1}: {chart.get('title', 'Untitled Chart')}
Chart Type: {chart_type}
{x_values_sample}
{y_values_sample}
Description: Visual representation of {chart.get('title', 'dataset relationship')}.
"""
        chunks.append(chart_chunk.strip())

    if insights and isinstance(insights, str) and "generating insights" not in insights.lower():
        chunks.append(f"Business Insights:\n{insights}".strip())

    return chunks


def retrieve_dashboard_context(question: str, profile: Dict, charts: List[Dict], insights: str, k: int = 4) -> str:
    chunks = build_dashboard_chunks(profile or {}, charts or [], insights or "")
    if not chunks:
        return ""

    q_tokens = _tokenize(question)
    if not q_tokens:
        return "\n\n".join(chunks[:k])

    scored = []
    for chunk in chunks:
        c_tokens = _tokenize(chunk)
        overlap = len(q_tokens.intersection(c_tokens))
        scored.append((overlap, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [chunk for score, chunk in scored if score > 0][:k]
    if not top_chunks:
        top_chunks = chunks[:k]

    return "\n\n".join(top_chunks)
