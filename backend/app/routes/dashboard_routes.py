from fastapi import APIRouter
from concurrent.futures import ThreadPoolExecutor
import threading

from app.services.dataset_loader import load_dataset
from app.services.data_profiler import profile_dataset
from app.services.visualization_engine import generate_visualizations
from app.services.insight_generator import generate_insights

router = APIRouter()

# ✅ store dataset sessions
dataset_sessions = {}


def generate_insights_background(file_path, profile, charts):
    try:
        print(f"[INSIGHTS STARTED] {file_path}")

        insights = generate_insights(profile, charts)

        print(f"[INSIGHTS GENERATED] {insights[:200]}")

        dataset_sessions[file_path]["insights_ready"] = True

        print(f"[INSIGHTS STORED] {file_path}")

    except Exception as e:
        print("[❌ INSIGHT ERROR]:", str(e))


@router.get("/analyze")
def analyze_dataset(file_path: str):

    try:
        df = load_dataset(file_path)

        dataset_stats = {
            "file_name": file_path.split("/")[-1],
            "rows": len(df),
            "columns": len(df.columns),
            "missing_values": int(df.isnull().sum().sum())
        }

        # ✅ parallel execution (FAST)
        with ThreadPoolExecutor() as executor:
            future_charts = executor.submit(generate_visualizations, df)
            future_profile = executor.submit(profile_dataset, df)

            charts = future_charts.result()
            profile = future_profile.result()

        # ✅ store context FIRST
        dataset_sessions[file_path] = {
            "profile": profile,
            "charts": charts,
            "insights": None
        }

        # 🔥 START INSIGHTS IN BACKGROUND (CRITICAL FIX)
        threading.Thread(
            target=generate_insights_background,
            args=(file_path, profile, charts)
        ).start()

        return {
            "status": "success",
            "charts": charts,
            "dataset_stats": dataset_stats,
            "message": "Charts ready. Insights generating in background."
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

    # 🔥 FIX: Explicit handling
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


@router.get("/preview")
def preview_data(file_path: str):

    from app.services.dataset_loader import load_dataset

    try:
        df = load_dataset(file_path)

        return {
            "status": "success",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(orient="records")
        }

    except Exception as e:
        print("[PREVIEW ERROR]:", e)
        return {
            "status": "error",
            "columns": [],
            "rows": []
        }