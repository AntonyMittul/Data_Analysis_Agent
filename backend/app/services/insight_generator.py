import json
from app.config.llm import get_llm

# Slightly higher ceiling + warmth for a richer, analyst-style briefing.
llm = get_llm(temperature=0.3, max_output_tokens=1500)

def summarize_charts(charts):
    """Reduce each chart to compact numeric stats (min/max/avg/points) for the LLM."""
    summaries = []

    for chart in charts:
        try:
            fig = chart.get("figure", {})
            data = fig.get("data", [])

            if not data:
                continue

            trace = data[0]
            
            # Find values key dynamically (Plotly Express maps to y, values, or x)
            values = []
            if "y" in trace and trace["y"] is not None:
                values = trace["y"]
            elif "values" in trace and trace["values"] is not None:
                values = trace["values"]
            elif "x" in trace and trace["x"] is not None:
                values = trace["x"]

            # Ensure values is list-like and iterable safely
            if not isinstance(values, (list, tuple, set)):
                try:
                    if isinstance(values, (dict, str)) or values is None:
                        values = []
                    else:
                        values = list(values)
                except:
                    values = []

            # Convert to numeric safely
            clean_vals = []
            for val in values:
                try:
                    clean_vals.append(float(val))
                except:
                    continue  # skip invalid values

            if len(clean_vals) == 0:
                continue

            summary = {
                "title": chart.get("title"),
                "max": max(clean_vals),
                "min": min(clean_vals),
                "avg": round(sum(clean_vals)/len(clean_vals), 2),
                "points": len(clean_vals)
            }

            summaries.append(summary)

        except Exception as e:
            print("[CHART SUMMARY ERROR]", e)

    return summaries


def generate_insights(profile, charts):
    try:
        print("[INSIGHT GENERATION STARTED]")

        compact_profile = {
            "row_count": profile.get("rows", 0),
            "column_count": profile.get("columns", 0),
            "all_columns": profile.get("all_columns", []),
            "numeric_columns": profile.get("numeric_columns", []),
            "categorical_columns": profile.get("categorical_columns", []),
            "datetime_columns": profile.get("datetime_columns", [])
        }

        # Use the compact numeric summary instead of raw chart JSON to keep the prompt small.
        chart_summary = summarize_charts(charts)

        prompt = f"""
You are a senior business analyst writing a briefing for an executive. Using ONLY
the dataset summary and chart statistics below, produce a concise, decision-focused
analysis — not a list of chart descriptions.

Dataset Summary:
{compact_profile}

Chart Statistics:
{chart_summary}

Write in clean Markdown with EXACTLY these sections:

## Executive Summary
2-3 sentences capturing the single most important story in this data.

## Key Findings
3-5 bullet points. For each finding, state what the data shows, then briefly WHY it
matters and its likely business IMPACT. Use real numbers from the summary/stats.

## Risks & Anomalies
2-3 bullets on concerning patterns, outliers, or threats in the data.

## Opportunities
2-3 bullets on areas the business could capitalize on.

## Recommended Actions
3-4 specific, actionable next steps a manager could take based on this data.

Rules:
- Use ACTUAL figures from the summary/stats; never invent numbers.
- Be business-focused (revenue, efficiency, growth, risk) — avoid generic phrasing
  like "the bar chart shows...".
- Keep it tight and skimmable. Never say the data is missing.
"""

        print("[LLM CALL STARTED]")

        response = llm.invoke(prompt)

        print("[LLM RESPONSE RECEIVED]")

        if not response or len(response.strip()) < 20:
            print("[RETRYING]")
            response = llm.invoke(prompt)

        if not response or len(response.strip()) < 20:
            return "⚠️ Unable to generate insights."

        return response

    except Exception as e:
        print("[INSIGHT ERROR]:", str(e))
        return "⚠️ Insight generation failed."
