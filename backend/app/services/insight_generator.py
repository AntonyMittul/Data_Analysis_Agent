from langchain_ollama import OllamaLLM
import json
from app.config.settings import OLLAMA_MODEL

# ✅ Optimized LLM config
llm = OllamaLLM(
    model=OLLAMA_MODEL,
    temperature=0.1,
    num_ctx=1024,
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
            y = trace.get("y", [])

            # 🔥 FIX: convert to numeric safely
            clean_y = []

            for val in y:
                try:
                    clean_y.append(float(val))
                except:
                    continue  # skip invalid values

            if len(clean_y) == 0:
                continue

            summary = {
                "title": chart.get("title"),
                "max": max(clean_y),
                "min": min(clean_y),
                "avg": round(sum(clean_y)/len(clean_y), 2),
                "points": len(clean_y)
            }

            summaries.append(summary)

        except Exception as e:
            print("[CHART SUMMARY ERROR]", e)

    return summaries


def generate_insights(profile, charts):

    try:
        print("[INSIGHT GENERATION STARTED]")

        compact_profile = {
            "columns": profile.get("columns", []),
            "row_count": profile.get("row_count", 0),
            "missing_values": profile.get("missing_values", {}),
            "data_types": profile.get("data_types", {})
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
