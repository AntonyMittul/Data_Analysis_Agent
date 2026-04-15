from langchain_ollama import OllamaLLM
import json
from app.config.settings import OLLAMA_MODEL


def plan_visualizations(dataset_profile):

    llm = OllamaLLM(
        model=OLLAMA_MODEL,
        temperature=0.1,
        num_predict=512,
        top_p=0.9,
        top_k=20
    )

    prompt = f"""
You are a data visualization expert.

Given the dataset summary below, suggest the most meaningful visualizations
to help a business analyst understand the dataset.

Dataset summary:

Rows: {dataset_profile["rows"]}

Numeric Columns:
{dataset_profile["numeric_columns"]}

Categorical Columns:
{dataset_profile["categorical_columns"]}

Datetime Columns:
{dataset_profile.get("datetime_columns", [])}

Return a JSON list of visualization plans.

Each visualization must include:

chart_type (line, bar, scatter, histogram)
x_column
y_column
title

Example output:

[
  {{
    "chart_type": "line",
    "x_column": "date",
    "y_column": "sales",
    "title": "Sales Trend Over Time"
  }},
  {{
    "chart_type": "bar",
    "x_column": "store",
    "y_column": "sales",
    "title": "Sales by Store"
  }}
]
"""

    response = llm.invoke(prompt)

    try:
        plan = json.loads(response)
        return plan

    except:
        return []
