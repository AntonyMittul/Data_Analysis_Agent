from langchain_ollama import OllamaLLM
import json
from app.config.settings import OLLAMA_MODEL

# ✅ Optimized LLM config
llm = OllamaLLM(
    model=OLLAMA_MODEL,
    temperature=0.1,
    num_ctx=4096,
    num_predict=300
)

# 🔥 ADD THIS FUNCTION
def summarize_charts(charts):
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

        # 🔥 USE CLEAN SUMMARY INSTEAD OF RAW CHART JSON
        chart_summary = summarize_charts(charts)

        prompt = f"""
You are a business analyst.

Dataset Summary:
{compact_profile}

Chart Insights:
{chart_summary}

Generate COMPLETE insights.

FORMAT:

Key Trends:
1.
2.
3.

Issues:
1.
2.

Recommendations:
1.
2.
3.

IMPORTANT:
- Use actual numbers from chart summary
- Do NOT say data is missing
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
        print("[❌ INSIGHT ERROR]:", str(e))
        return "⚠️ Insight generation failed."
