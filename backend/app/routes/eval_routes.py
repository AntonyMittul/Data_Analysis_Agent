"""Evaluation endpoint for the Data Dashboard (additive feature).

Reads the already-computed analysis from the dashboard session store and scores
its charts + insights. It only reads existing state and does not modify it.
"""
from fastapi import APIRouter

from app.routes.dashboard_routes import dataset_sessions
from app.services.evaluation import evaluate_outputs

router = APIRouter()


@router.get("/evaluate")
def evaluate_dashboard(file_path: str):
    context = dataset_sessions.get(file_path)
    if not context:
        return {"status": "pending", "message": "Analysis not ready yet."}

    try:
        result = evaluate_outputs(
            context.get("profile"),
            context.get("charts"),
            context.get("insights"),
        )
        return {"status": "success", **result}
    except Exception as e:  # never 500 — the eval card is non-critical
        print("[EVAL ERROR]:", e)
        return {"status": "error", "message": "Could not evaluate this analysis."}
