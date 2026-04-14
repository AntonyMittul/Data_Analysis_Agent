import pandas as pd
from app.services.data_profiler import get_column_metadata
from app.services.visualization_engine import generate_visualizations


class StructuredDataAgent:

    def __init__(self):
        pass

    # ===============================
    # 🔹 STEP 1: PREPROCESS DATA
    # ===============================
    def preprocess(self, df: pd.DataFrame):

        df = df.copy()
        df = df.drop_duplicates()

        for col in df.columns:
            if df[col].dtype in ["int64", "float64"]:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna("Unknown")

        return df

    # ===============================
    # 🔹 STEP 2: IDENTIFY USEFUL COLUMNS
    # ===============================
    def is_identifier(self, col: str):
        col = col.lower()
        return "id" in col or "code" in col

    def filter_columns(self, metadata):

        numeric = []
        categorical = []
        datetime = []

        for col, meta in metadata.items():

            if self.is_identifier(col):
                continue

            if meta["type"] == "numeric":
                numeric.append(col)

            elif meta["type"] == "categorical":
                categorical.append(col)

            elif meta["type"] == "datetime":
                datetime.append(col)

        return numeric, categorical, datetime

    # ===============================
    # 🔹 STEP 3: DATA UNDERSTANDING
    # ===============================
    def analyze_structure(self, df: pd.DataFrame):

        metadata = get_column_metadata(df)

        numeric_cols, categorical_cols, datetime_cols = self.filter_columns(metadata)

        return {
            "metadata": metadata,
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "datetime_columns": datetime_cols
        }

    # ===============================
    # 🔹 STEP 4: GENERATE VISUALS
    # ===============================
    def generate_visuals(self, df: pd.DataFrame):
        return generate_visualizations(df)

    # ===============================
    # 🔥 STEP 5: BUILD LIGHTWEIGHT LLM CONTEXT
    # ===============================
    def build_context(self, df, structure_info):

        # 🔥 SMALL SAMPLE ONLY
        df_sample = df.head(30)

        columns = list(df.columns)

        # 🔹 LIMITED SCHEMA
        schema = {}
        for col in columns[:10]:
            try:
                schema[col] = {
                    "dtype": str(df[col].dtype),
                    "unique": int(df[col].nunique())
                }
            except:
                continue

        # 🔹 LIMITED NUMERIC STATS
        stats = {}
        for col in structure_info["numeric_columns"][:5]:
            try:
                stats[col] = {
                    "mean": round(float(df[col].mean()), 2),
                    "min": round(float(df[col].min()), 2),
                    "max": round(float(df[col].max()), 2)
                }
            except:
                continue

        # 🔹 LIMITED CATEGORIES
        categories = {}
        for col in structure_info["categorical_columns"][:3]:
            try:
                categories[col] = df[col].value_counts().head(3).to_dict()
            except:
                continue

        # 🔥 LIMIT TEXT SIZE
        sample_text = df_sample.to_string(index=False)[:1500]

        llm_context = f"""
DATA OVERVIEW:
Rows: {len(df)}, Columns: {len(columns)}

Columns:
{', '.join(columns[:15])}

Schema:
{schema}

Sample:
{sample_text}

Stats:
{stats}

Categories:
{categories}
"""

        return {
            "structured": {
                "columns": columns,
                "stats": stats,
                "categories": categories
            },
            "llm_context": llm_context
        }

    # ===============================
    # 🔹 MAIN PIPELINE
    # ===============================
    def run(self, df: pd.DataFrame):

        try:
            df = self.preprocess(df)
            structure_info = self.analyze_structure(df)
            visuals = self.generate_visuals(df)
            context = self.build_context(df, structure_info)

            return {
                "status": "success",
                "visuals": visuals,
                "context": context
            }

        except Exception as e:
            print("[STRUCTURED AGENT ERROR]:", e)

            return {
                "status": "error",
                "visuals": [],
                "context": {}
            }