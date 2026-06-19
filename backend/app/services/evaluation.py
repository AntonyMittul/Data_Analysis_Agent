"""Evaluation of generated dashboard outputs.

Scores the auto-generated charts and AI insights on three axes — accuracy,
relevance and consistency — using only the dataset profile and the generated
artifacts. The checks are deterministic (no extra LLM calls), so scores are
free to compute, instant, reproducible, and fully explainable.

This module is additive: it reads existing analysis output and never mutates it.
"""
import re

# Sections the executive summary is expected to contain.
INSIGHT_SECTIONS = [
    "executive summary",
    "key findings",
    "risk",
    "opportunit",
    "recommend",
]


def _clamp(x: float) -> int:
    return int(max(0, min(100, round(x))))


def _chart_type(chart: dict) -> str:
    try:
        return chart["figure"]["data"][0].get("type", "") or ""
    except Exception:
        return ""


def _chart_columns(chart: dict) -> set:
    """Columns a chart plots, read from axis titles, heatmap axes and category."""
    found = set()
    fig = chart.get("figure", {}) or {}
    layout = fig.get("layout", {}) or {}
    for axis in ("xaxis", "yaxis"):
        title = layout.get(axis, {}).get("title", {}) if isinstance(layout.get(axis), dict) else {}
        text = title.get("text") if isinstance(title, dict) else title
        if text:
            found.add(str(text).lower())
    for trace in fig.get("data", []):
        if trace.get("type") == "heatmap":  # correlation matrix: axes list every measure
            for arr in (trace.get("x"), trace.get("y")):
                if isinstance(arr, list):
                    found.update(str(v).lower() for v in arr)
    if chart.get("category"):
        found.add(str(chart["category"]).lower())
    return found


def _chart_valid(chart: dict) -> bool:
    """A chart is valid if it has at least one trace carrying data."""
    try:
        traces = chart["figure"]["data"]
        return bool(traces) and any(
            t.get("x") or t.get("y") or t.get("values") or t.get("labels") or t.get("z")
            for t in traces
        )
    except Exception:
        return False


def _number_grounding(profile: dict, text: str):
    """Fraction of figures cited in the insights that are plausible for the data."""
    nums = []
    for raw in re.findall(r"-?\d[\d,]*\.?\d*", text):
        try:
            nums.append(float(raw.replace(",", "")))
        except ValueError:
            continue
    if not nums:
        return 100.0, "no specific figures cited"

    stats = profile.get("summary_stats", {}) or {}
    mins = [s["min"] for s in stats.values() if isinstance(s, dict) and "min" in s]
    maxs = [s["max"] for s in stats.values() if isinstance(s, dict) and "max" in s]
    g_min = min(mins) if mins else 0
    g_max = max(maxs) if maxs else 0
    upper = max(g_max, profile.get("rows", 0) or 0) * 1.05

    grounded = 0
    for n in nums:
        a = abs(n)
        if 0 <= a <= 100:          # percentages, small counts, list markers
            grounded += 1
        elif g_min - 1 <= n <= upper:   # within the dataset's value range (with slack)
            grounded += 1
    pct = grounded / len(nums) * 100
    return pct, f"{grounded}/{len(nums)} cited figures fall within the data's range"


def evaluate_outputs(profile: dict, charts: list, insights) -> dict:
    """Return accuracy / relevance / consistency scores (0-100) with explanations."""
    profile = profile or {}
    charts = charts or []
    text = (insights or "").lower() if isinstance(insights, str) else ""
    has_insights = len(text.strip()) > 20

    cols = [str(c) for c in (profile.get("all_columns") or [])]
    col_set = {c.lower() for c in cols}
    analyzable = (
        {str(c).lower() for c in profile.get("numeric_columns", [])}
        | {str(c).lower() for c in profile.get("categorical_columns", [])}
        | {str(c).lower() for c in profile.get("datetime_columns", [])}
    )
    tokens = set(re.findall(r"[a-z0-9_]+", text))

    details = {}

    # ---------- ACCURACY: are the outputs grounded in the real data? ----------
    chart_cats = [str(c.get("category")).lower() for c in charts if c.get("category")]
    grounded_charts = sum(1 for c in chart_cats if c in col_set)
    acc_charts = (grounded_charts / len(chart_cats) * 100) if chart_cats else 100.0
    acc_numbers, num_note = _number_grounding(profile, text) if has_insights else (100.0, "insights pending")
    accuracy = _clamp(0.6 * acc_charts + 0.4 * acc_numbers)
    details["accuracy"] = {
        "score": accuracy,
        "checks": [
            f"Charts use real columns: {grounded_charts}/{len(chart_cats) or 0}",
            f"Insight figures grounded: {num_note}",
        ],
    }

    # ---------- RELEVANCE: do the outputs cover what matters? ----------
    # Chart titles embed the columns they plot (e.g. "Total revenue by region"),
    # so scan titles + categories + insight text for analyzable columns.
    title_blob = " ".join(str(c.get("title", "")).lower() for c in charts)
    covered = set(chart_cats)
    for c in charts:
        covered |= _chart_columns(c)
    for c in analyzable:
        if c in tokens or c in title_blob or c.replace("_", " ") in title_blob:
            covered.add(c)
    coverage = (len(covered & analyzable) / len(analyzable) * 100) if analyzable else 100.0
    variety = min(100.0, len({_chart_type(c) for c in charts if _chart_type(c)}) / 4 * 100)
    cols_in_text = sum(1 for c in cols if c.lower() in tokens or c.lower().replace("_", " ") in text)
    insight_focus = min(100.0, cols_in_text / max(1, min(5, len(cols))) * 100) if has_insights else 100.0
    relevance = _clamp(0.6 * coverage + 0.2 * variety + 0.2 * insight_focus)
    details["relevance"] = {
        "score": relevance,
        "checks": [
            f"Key columns covered by charts: {len(covered & analyzable)}/{len(analyzable) or 0}",
            f"Chart-type variety, insights reference {cols_in_text} real columns",
        ],
    }

    # ---------- CONSISTENCY: are the outputs complete & coherent? ----------
    valid_charts = sum(1 for c in charts if _chart_valid(c))
    chart_validity = (valid_charts / len(charts) * 100) if charts else 0.0
    if has_insights:
        sections = sum(1 for s in INSIGHT_SECTIONS if s in text)
        completeness = sections / len(INSIGHT_SECTIONS) * 100
        consistency = _clamp(0.5 * chart_validity + 0.5 * completeness)
        cons_checks = [
            f"Valid charts: {valid_charts}/{len(charts) or 0}",
            f"Summary sections present: {sections}/{len(INSIGHT_SECTIONS)}",
        ]
    else:
        consistency = _clamp(chart_validity)
        cons_checks = [f"Valid charts: {valid_charts}/{len(charts) or 0}", "Summary pending"]
    details["consistency"] = {"score": consistency, "checks": cons_checks}

    overall = round((accuracy + relevance + consistency) / 3)

    return {
        "accuracy": accuracy,
        "relevance": relevance,
        "consistency": consistency,
        "overall": overall,
        "insights_evaluated": has_insights,
        "charts_evaluated": len(charts),
        "details": details,
    }
