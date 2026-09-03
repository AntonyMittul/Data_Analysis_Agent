import re
import json
import numpy as np
import pandas as pd
import plotly.express as px

from app.config.llm import get_llm
from app.services.data_profiler import profile_dataset

# ===============================
# CONFIG
# ===============================
TEMPLATE = "plotly_white"
QUAL = px.colors.qualitative.Set2
MAX_SCATTER_POINTS = 4000
MAX_BARS = 12


# ===============================
# PREPROCESSING
# ===============================
def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.drop_duplicates()

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median())
        elif "datetime" in str(df[col].dtype):
            df[col] = pd.to_datetime(df[col], errors="coerce")
        else:
            df[col] = df[col].fillna("Unknown")

    return df


# ===============================
# SEMANTIC COLUMN CLASSIFICATION
# ===============================
def _tokens(name) -> set:
    return set(t for t in re.split(r"[^a-z0-9]+", str(name).lower()) if t)


_MEASURE_HINTS = {"usd", "amount", "price", "cost", "revenue", "sales", "value",
                  "income", "salary", "profit", "spend", "budget", "gain",
                  "count", "score", "rate", "level", "qty", "quantity", "total"}


def _is_identifier(col, series, n_rows) -> bool:
    toks = _tokens(col)
    if toks & {"id", "code", "uuid", "guid", "key", "sku", "index"}:
        return True
    if str(col).lower().endswith("_id"):
        return True
    # Near-unique integer columns *with no measure-like name* behave like keys.
    # (Monetary/quantity columns are often unique too, so never drop those.)
    if toks & _MEASURE_HINTS:
        return False
    try:
        if (n_rows > 20 and pd.api.types.is_integer_dtype(series)
                and series.nunique(dropna=True) / n_rows > 0.98):
            return True
    except Exception:
        pass
    return False


def _is_year_series(series) -> bool:
    try:
        v = pd.to_numeric(series, errors="coerce").dropna()
        if len(v) == 0:
            return False
        whole = (v == v.round()).mean() > 0.99
        in_range = v.between(1900, 2100).mean() > 0.95
        return bool(whole and in_range and v.nunique() <= 150)
    except Exception:
        return False


def classify_columns(df: pd.DataFrame):
    """Split columns by *meaning*, not just dtype.

    measures      -> continuous numerics worth aggregating (sales, score, ...)
    categoricals  -> low/medium-cardinality dimensions (industry, region, ...)
    datetimes     -> real datetime columns
    years         -> integer year columns (treated as a time dimension, NOT a metric)
    ids           -> identifiers / high-cardinality text (skipped for charts)
    """
    n = len(df)
    measures, categoricals, datetimes, years, ids = [], [], [], [], []

    for col in df.columns:
        s = df[col]

        if pd.api.types.is_datetime64_any_dtype(s):
            datetimes.append(col)
            continue

        if _is_identifier(col, s, n):
            ids.append(col)
            continue

        if pd.api.types.is_numeric_dtype(s):
            if "year" in _tokens(col) or _is_year_series(s):
                years.append(col)
            else:
                measures.append(col)
            continue

        # object / categorical
        nun = s.nunique(dropna=True)
        if 1 < nun <= 50:
            categoricals.append(col)
        elif nun > 50:
            ids.append(col)  # free text / high-cardinality -> not chartable

    return measures, categoricals, datetimes, years, ids


def _aggregation_for(measure: str, series) -> str:
    """Rates/levels/scores are averaged; additive quantities are summed."""
    toks = _tokens(measure)
    if toks & {"rate", "level", "score", "ratio", "percent", "percentage",
               "avg", "average", "mean", "index", "rating", "pct", "probability"}:
        return "mean"
    try:
        v = series.dropna()
        if len(v) and v.min() >= 0 and v.max() <= 1:
            return "mean"
    except Exception:
        pass
    return "sum"


def _fig_json(fig):
    return json.loads(fig.to_json())


# ===============================
# CHART BUILDERS (each returns {title, figure} or None)
# ===============================
def _bar_category_counts(df, cat):
    vc = df[cat].value_counts().head(MAX_BARS).reset_index()
    vc.columns = [cat, "count"]
    fig = px.bar(vc, x=cat, y="count", color=cat,
                 title=f"Record count by {cat}",
                 color_discrete_sequence=QUAL)
    fig.update_layout(template=TEMPLATE, xaxis_tickangle=-30,
                      showlegend=False, margin=dict(b=110))
    return {"title": f"Record count by {cat}", "figure": _fig_json(fig), "category": cat}


def _pie_category_share(df, cat):
    vc = df[cat].value_counts().reset_index()
    vc.columns = [cat, "count"]
    if len(vc) > 6:
        top = vc.head(5)
        other = pd.DataFrame([{cat: "Other", "count": vc.iloc[5:]["count"].sum()}])
        vc = pd.concat([top, other], ignore_index=True)
    fig = px.pie(vc, names=cat, values="count", hole=0.4,
                 title=f"{cat} share",
                 color_discrete_sequence=px.colors.qualitative.Pastel)
    fig.update_traces(textposition="inside", textinfo="percent+label")
    fig.update_layout(template=TEMPLATE)
    return {"title": f"{cat} share", "figure": _fig_json(fig), "category": cat, "recipe": {"type": "pie", "cat": cat}}


def _bar_measure_by_category(df, measure, cat):
    agg = _aggregation_for(measure, df[measure])
    g = getattr(df.groupby(cat)[measure], agg)().reset_index()
    g = g.sort_values(measure, ascending=False).head(MAX_BARS)
    g[measure] = g[measure].round(2)
    label = "Average" if agg == "mean" else "Total"
    title = f"{label} {measure} by {cat}"
    fig = px.bar(g, x=cat, y=measure, color=cat, title=title,
                 color_discrete_sequence=QUAL)
    fig.update_layout(template=TEMPLATE, xaxis_tickangle=-30,
                      showlegend=False, margin=dict(b=110))
    return {"title": title, "figure": _fig_json(fig), "category": cat, "recipe": {"type": "bar", "measure": measure, "cat": cat}}


def _line_trend(df, measure, tcol, is_year):
    agg = _aggregation_for(measure, df[measure])

    if is_year:
        g = getattr(df.groupby(df[tcol].round().astype("Int64"))[measure], agg)().reset_index()
        g.columns = [tcol, measure]
        g = g.dropna().sort_values(tcol)
    else:
        d = df.dropna(subset=[tcol]).sort_values(tcol)
        if d.empty:
            return None
        span = (d[tcol].max() - d[tcol].min()).days
        freq = "ME" if span > 365 else "W" if span > 30 else "D"
        g = getattr(d.set_index(tcol).resample(freq)[measure], agg)().reset_index()

    if len(g) < 2 or g[measure].nunique() < 2:
        return None

    g[measure] = g[measure].round(3)
    label = "Average" if agg == "mean" else "Total"
    title = f"{label} {measure} over {tcol}"
    fig = px.line(g, x=tcol, y=measure, markers=True, title=title)
    fig.update_traces(line=dict(color="#2563eb", width=3))

    # Simple linear projection for year trends so users see where it's heading.
    if is_year and len(g) >= 4:
        try:
            xv = g[tcol].astype(float).values
            yv = g[measure].astype(float).values
            coef = np.polyfit(xv, yv, 1)
            steps = max(2, len(xv) // 5)
            fut_x = [int(xv[-1]) + i for i in range(1, steps + 1)]
            fut_y = np.polyval(coef, fut_x)
            if agg == "mean" and yv.min() >= 0 and yv.max() <= 1:
                fut_y = np.clip(fut_y, 0, 1)
            fig.add_scatter(x=fut_x, y=np.round(fut_y, 3), mode="lines",
                            name="Forecast",
                            line=dict(color="#9333ea", width=2, dash="dash"))
        except Exception:
            pass

    fig.update_layout(template=TEMPLATE)
    return {"title": title, "figure": _fig_json(fig), "recipe": {"type": "line", "measure": measure, "tcol": tcol, "is_year": is_year}}


def _histogram(df, measure):
    v = pd.to_numeric(df[measure], errors="coerce").dropna()
    if v.nunique() < 5:
        return None
    counts, edges = np.histogram(v, bins=30)
    centers = (edges[:-1] + edges[1:]) / 2
    fig = px.bar(x=np.round(centers, 2), y=counts,
                 title=f"Distribution of {measure}",
                 color_discrete_sequence=["#6366f1"])
    fig.update_layout(template=TEMPLATE, bargap=0.04,
                      xaxis_title=measure, yaxis_title="count")
    return {"title": f"Distribution of {measure}", "figure": _fig_json(fig), "recipe": {"type": "histogram", "measure": measure}}


def _correlation_heatmap(df, measures):
    cols = measures[:8]
    corr = df[cols].corr(numeric_only=True).round(2)
    if corr.empty or len(cols) < 3:
        return None
    fig = px.imshow(corr, text_auto=True, aspect="auto",
                    color_continuous_scale="RdBu_r", zmin=-1, zmax=1,
                    title="Correlation between numeric columns")
    fig.update_layout(template=TEMPLATE)
    return {"title": "Correlation between numeric columns", "figure": _fig_json(fig), "recipe": {"type": "heatmap", "measures": measures}}


def _scatter(df, m1, m2, color_cat=None):
    cols = [m1, m2] + ([color_cat] if color_cat else [])
    d = df[cols].dropna()
    if len(d) < 2:
        return None
    if len(d) > MAX_SCATTER_POINTS:
        d = d.sample(MAX_SCATTER_POINTS, random_state=42)
    title = f"{m1} vs {m2}"
    fig = px.scatter(d, x=m1, y=m2, color=color_cat, opacity=0.55,
                     title=title, color_discrete_sequence=QUAL)
    fig.update_layout(template=TEMPLATE)
    return {"title": title, "figure": _fig_json(fig), "recipe": {"type": "scatter", "m1": m1, "m2": m2, "color_cat": color_cat}}


def _geo_map(df, geo, measure):
    agg = _aggregation_for(measure, df[measure])
    g = getattr(df.groupby(geo)[measure], agg)().reset_index()
    fig = px.choropleth(g, locations=geo, locationmode="country names",
                        color=measure, color_continuous_scale="Blues",
                        title=f"{measure} by {geo}")
    fig.update_layout(template=TEMPLATE)
    return {"title": f"{measure} by {geo} (Map)", "figure": _fig_json(fig), "recipe": {"type": "geo", "geo": geo, "measure": measure}}


# ===============================
# MAIN ENGINE
# ===============================
def generate_visualizations(df: pd.DataFrame, profile: dict = None):
    visuals = []
    df = preprocess_data(df)
    
    if profile is None:
        profile = profile_dataset(df)
    
    measures, categoricals, datetimes, years, ids = classify_columns(df)
    geo_cols = [c for c in df.columns if {"country", "region", "nation", "state"} & _tokens(c)]

    prompt = f"""
    You are an expert Data Analyst and Visualization designer.
    Analyze the following dataset metadata and choose up to 7 of the most insightful charts to build.
    
    Dataset Profile:
    {json.dumps(profile, indent=2)}
    
    Available time columns (years): {years}
    Available datetime columns: {datetimes}
    Available geographic columns: {geo_cols}
    
    Return a JSON array of "recipes" for the charts.
    Supported recipe types and their required keys:
    - {{"type": "pie", "cat": "COLUMN_NAME"}}
    - {{"type": "bar", "measure": "COLUMN_NAME", "cat": "COLUMN_NAME"}}
    - {{"type": "line", "measure": "COLUMN_NAME", "tcol": "TIME_COLUMN_NAME", "is_year": boolean}}
    - {{"type": "histogram", "measure": "COLUMN_NAME"}}
    - {{"type": "heatmap", "measures": ["COL1", "COL2", "COL3", ...]}} (Requires at least 3 numeric columns)
    - {{"type": "scatter", "m1": "NUM_COL1", "m2": "NUM_COL2", "color_cat": "OPTIONAL_CAT_COL"}}
    - {{"type": "geo", "geo": "GEO_COLUMN", "measure": "COLUMN_NAME"}}
    
    Select recipes that make sense for the available columns.
    OUTPUT ONLY THE JSON ARRAY. NO MARKDOWN. NO EXPLANATION.
    """
    
    try:
        llm = get_llm(temperature=0.1)
        response = llm.invoke(prompt)
        # Parse the JSON output safely
        clean_json = response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
            
        recipes = json.loads(clean_json.strip())
        
        for recipe in recipes:
            try:
                chart = build_chart_from_recipe(df, recipe)
                if chart:
                    visuals.append(chart)
            except Exception as e:
                print(f"[LLM CHART BUILD ERROR for {recipe}]:", e)
                
    except Exception as e:
        print("[LLM VISUALIZATION FAILURE]:", e)
        # Fallback to hardcoded heuristics
        measures = sorted(measures, key=lambda c: df[c].nunique(), reverse=True)
        categoricals = sorted(categoricals, key=lambda c: df[c].nunique())
        time_cols = [(c, False) for c in datetimes] + [(c, True) for c in years]

        primary_measure = measures[0] if measures else None
        primary_cat = categoricals[0] if categoricals else None

        plan = []
        if primary_cat:
            plan.append(lambda: _bar_category_counts(df, primary_cat))
            plan.append(lambda: _pie_category_share(df, primary_cat))
        if primary_measure and primary_cat:
            plan.append(lambda: _bar_measure_by_category(df, primary_measure, primary_cat))
        if primary_measure and time_cols:
            tcol, is_year = time_cols[0]
            plan.append(lambda: _line_trend(df, primary_measure, tcol, is_year))
        if primary_measure:
            plan.append(lambda: _histogram(df, primary_measure))
        if len(measures) >= 3:
            plan.append(lambda: _correlation_heatmap(df, measures))
        if len(measures) >= 2:
            plan.append(lambda: _scatter(df, measures[0], measures[1], primary_cat))
        if geo_cols and primary_measure:
            plan.append(lambda: _geo_map(df, geo_cols[0], primary_measure))

        for build in plan:
            try:
                chart = build()
                if chart:
                    visuals.append(chart)
            except Exception as e:
                print("[VISUAL BUILD ERROR]:", e)

    return visuals


# ===============================
# KPI CARDS (dataset-driven headline stats)
# ===============================
def _fmt_number(x):
    try:
        x = float(x)
    except Exception:
        return str(x)
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if abs(x) >= div:
            return f"{x / div:.1f}{unit}".replace(".0", "")
    return f"{x:,.0f}" if float(x).is_integer() else f"{x:,.2f}"


def build_kpi_cards(df: pd.DataFrame, quality: dict | None = None):
    """Produce 4 information-dense, dataset-specific KPI cards for the dashboard."""
    quality = quality or {}
    clean = preprocess_data(df)
    measures, categoricals, datetimes, years, ids = classify_columns(clean)
    cards = []

    # 1) Records
    cards.append({
        "title": "Records",
        "value": _fmt_number(len(df)),
        "subtitle": f"{df.shape[1]} columns",
        "icon": "database",
    })

    # 2) Feature breakdown
    parts = []
    if measures:
        parts.append(f"{len(measures)} numeric")
    if categoricals:
        parts.append(f"{len(categoricals)} categorical")
    if years or datetimes:
        parts.append(f"{len(years) + len(datetimes)} time")
    if ids:
        parts.append(f"{len(ids)} id/other")
    cards.append({
        "title": "Features",
        "value": str(df.shape[1]),
        "subtitle": " · ".join(parts) or "mixed types",
        "icon": "columns",
    })

    # 3) Data quality (from the raw, pre-cleaning file)
    miss = quality.get("missing_cells", 0)
    dup = quality.get("duplicate_rows", 0)
    if miss == 0 and dup == 0:
        q_val, q_sub = "Clean", "no missing values or duplicates"
    else:
        q_val = f"{100 - quality.get('missing_pct', 0):.0f}% complete"
        bits = []
        if miss:
            bits.append(f"{_fmt_number(miss)} missing cells")
        if dup:
            bits.append(f"{_fmt_number(dup)} duplicate rows")
        q_sub = " · ".join(bits) + " (cleaned)"
    cards.append({"title": "Data Quality", "value": q_val, "subtitle": q_sub, "icon": "check"})

    # 4) A content highlight chosen from the data itself
    highlight = None
    if years:
        col = years[0]
        v = pd.to_numeric(clean[col], errors="coerce").dropna()
        if len(v):
            lo, hi = int(v.min()), int(v.max())
            highlight = {"title": "Time span", "value": f"{lo}–{hi}",
                         "subtitle": f"{hi - lo} years", "icon": "calendar"}
    if highlight is None and datetimes:
        col = datetimes[0]
        d = clean[col].dropna()
        if len(d):
            highlight = {"title": "Date range",
                         "value": f"{d.min():%b %Y} – {d.max():%b %Y}",
                         "subtitle": col, "icon": "calendar"}
    if highlight is None and categoricals:
        col = categoricals[0]
        vc = clean[col].value_counts(normalize=True)
        if len(vc):
            highlight = {"title": f"Top {col}", "value": str(vc.index[0]),
                         "subtitle": f"{vc.iloc[0] * 100:.0f}% of records", "icon": "trophy"}
    if highlight is None and measures:
        col = measures[0]
        agg = _aggregation_for(col, clean[col])
        val = getattr(clean[col], agg)()
        label = "Avg" if agg == "mean" else "Total"
        highlight = {"title": f"{label} {col}", "value": _fmt_number(val),
                     "subtitle": "across all records", "icon": "trending"}
    if highlight:
        cards.append(highlight)

    return cards


# ===============================
# FILTER OPTIONS (for global dashboard filters)
# ===============================
def build_filter_options(df: pd.DataFrame):
    """Describe which columns can be filtered and their possible values.

    Categorical columns -> a list of values (dropdown). Year/numeric-time
    columns -> a {min, max} range.
    """
    clean = preprocess_data(df)
    measures, categoricals, datetimes, years, ids = classify_columns(clean)

    options = {"categorical": {}, "ranges": {}}

    for col in categoricals:
        vals = clean[col].dropna().astype(str).value_counts().index.tolist()[:50]
        options["categorical"][col] = sorted(vals)

    for col in years:
        v = pd.to_numeric(clean[col], errors="coerce").dropna()
        if len(v):
            options["ranges"][col] = {"min": int(v.min()), "max": int(v.max())}

    return options


def apply_filters(df: pd.DataFrame, spec: dict):
    """Apply a filter spec: {filters: {col: value}, ranges: {col: [lo, hi]}}."""
    if not spec:
        return df
    out = df
    for col, val in (spec.get("filters") or {}).items():
        if val not in (None, "", "All") and col in out.columns:
            out = out[out[col].astype(str) == str(val)]
    for col, rng in (spec.get("ranges") or {}).items():
        if col in out.columns and isinstance(rng, (list, tuple)) and len(rng) == 2:
            s = pd.to_numeric(out[col], errors="coerce")
            out = out[(s >= rng[0]) & (s <= rng[1])]
    return out


def build_chart_from_recipe(df: pd.DataFrame, recipe: dict):
    """Rebuilds a specific chart from its recipe."""
    df = preprocess_data(df)
    t = recipe.get("type")
    
    if t == "pie":
        return _pie_category_share(df, recipe["cat"])
    elif t == "bar":
        return _bar_measure_by_category(df, recipe["measure"], recipe["cat"])
    elif t == "line":
        return _line_trend(df, recipe["measure"], recipe["tcol"], recipe["is_year"])
    elif t == "histogram":
        return _histogram(df, recipe["measure"])
    elif t == "heatmap":
        return _correlation_heatmap(df, recipe["measures"])
    elif t == "scatter":
        return _scatter(df, recipe["m1"], recipe["m2"], recipe.get("color_cat"))
    elif t == "geo":
        return _geo_map(df, recipe["geo"], recipe["measure"])
    return None
