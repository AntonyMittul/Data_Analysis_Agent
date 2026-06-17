from fastapi import APIRouter
from concurrent.futures import ThreadPoolExecutor
import threading
import json
import os

from app.services.dataset_loader import load_dataset
from app.services.data_profiler import profile_dataset
from app.services.visualization_engine import (
    generate_visualizations,
    build_kpi_cards,
    build_filter_options,
    apply_filters,
)
from app.services.insight_generator import generate_insights

router = APIRouter()

# In-memory cache of analyzed datasets, keyed by file path.
dataset_sessions = {}


def generate_insights_background(file_path, profile, charts):
    try:
        print(f"[INSIGHTS STARTED] {file_path}")

        insights = generate_insights(profile, charts)
        dataset_sessions[file_path]["insights"] = insights

        print(f"[INSIGHTS GENERATED] {insights[:200]}")

        dataset_sessions[file_path]["insights_ready"] = True

        print(f"[INSIGHTS STORED] {file_path}")

    except Exception as e:
        print("[INSIGHT ERROR]:", str(e))


@router.get("/analyze")
def analyze_dataset(file_path: str, filters: str = None, with_insights: bool = True):
    try:
        df_full, quality = load_dataset(file_path, return_quality=True)

        # Filter options always reflect the FULL dataset so selections stay available.
        filter_options = build_filter_options(df_full)

        # Apply the active filter selection (if any) before computing everything else.
        spec = None
        if filters:
            try:
                spec = json.loads(filters)
            except Exception:
                spec = None
        df = apply_filters(df_full, spec) if spec else df_full
        if len(df) == 0:  # filters excluded everything — fall back to full data
            df = df_full

        try:
            size_kb = round(os.path.getsize(file_path) / 1024, 1)
        except OSError:
            size_kb = 0

        dataset_stats = {
            "file_name": file_path.replace("\\", "/").split("/")[-1],
            "rows": len(df),
            "columns": len(df.columns),
            "missing_values": quality.get("missing_cells", 0),
            "duplicate_rows": quality.get("duplicate_rows", 0),
            "size_kb": size_kb,
            "cards": build_kpi_cards(df, quality),
        }

        # Generate charts and profile the data in parallel.
        with ThreadPoolExecutor() as executor:
            future_charts = executor.submit(generate_visualizations, df)
            future_profile = executor.submit(profile_dataset, df)

            charts = future_charts.result()
            profile = future_profile.result()

        # Build the structured-data context the data-chat agent will use.
        from app.agents.structured_agent import StructuredDataAgent
        agent = StructuredDataAgent()
        structure_info = {
            "numeric_columns": profile.get("numeric_columns", []),
            "categorical_columns": profile.get("categorical_columns", []),
            "datetime_columns": profile.get("datetime_columns", [])
        }
        agent_context = agent.build_context(df, structure_info)

        # Store the session context before starting background insight generation.
        dataset_sessions[file_path] = {
            "profile": profile,
            "charts": charts,
            "insights": None,
            "context": agent_context
        }

        # Regenerate the executive summary only when asked (initial analyze).
        # Filter changes skip this to stay instant and avoid extra LLM calls.
        if with_insights:
            threading.Thread(
                target=generate_insights_background,
                args=(file_path, profile, charts)
            ).start()

        return {
            "status": "success",
            "charts": charts,
            "dataset_stats": dataset_stats,
            "filter_options": filter_options,
            "message": "Charts ready."
        }

    except Exception as e:
        print("[ANALYZE ERROR]:", e)
        return {
            "status": "error",
            "charts": [],
            "dataset_stats": {},
            "message": "Failed to process dataset"
        }


@router.get("/insights")
def get_insights(file_path: str):
    context = dataset_sessions.get(file_path)

    if not context:
        return {
            "status": "error",
            "insights": "No dataset found"
        }

    insights = context.get("insights")

    # Distinguish "still generating" from a ready or failed summary.
    if insights is None:
        return {
            "status": "processing",
            "insights": "Generating insights..."
        }

    if isinstance(insights, str) and len(insights.strip()) > 0:
        return {
            "status": "success",
            "insights": insights
        }

    return {
        "status": "error",
        "insights": "Failed to generate insights"
    }


@router.get("/insights/refresh")
def refresh_insights(file_path: str):
    """Regenerate the executive summary for the currently analyzed (filtered) data."""
    context = dataset_sessions.get(file_path)
    if not context:
        return {"status": "error", "message": "No analysis found. Re-upload the dataset."}

    context["insights"] = None
    threading.Thread(
        target=generate_insights_background,
        args=(file_path, context["profile"], context["charts"])
    ).start()
    return {"status": "started"}


@router.get("/preview")
def preview_data(file_path: str, limit: int = 100):
    """Return a small, JSON-safe sample of the raw file.

    Only the first `limit` rows are read/serialized — returning the entire
    dataset (which could be hundreds of thousands of rows) made the endpoint
    hang and ship tens of MB of JSON.
    """
    import pandas as pd

    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path, nrows=limit)
        elif file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path, nrows=limit)
        else:
            return {"status": "error", "columns": [], "rows": [], "message": "Unsupported file format"}

        # Make every cell JSON-safe (NaN -> None, timestamps/objects -> str-friendly).
        safe = df.astype(object).where(pd.notnull(df), None)

        return {
            "status": "success",
            "columns": list(df.columns),
            "rows": safe.to_dict(orient="records"),
            "showing": len(df),
        }

    except Exception as e:
        print("[PREVIEW ERROR]:", e)
        return {
            "status": "error",
            "columns": [],
            "rows": [],
        }
