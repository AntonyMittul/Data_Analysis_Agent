import pandas as pd

def profile_dataset(df):
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()
    datetime_cols = df.select_dtypes(include=["datetime"]).columns.tolist()

    useful_numeric = []
    useful_categorical = []

    # -----------------------------
    # Select numeric columns with variation
    # -----------------------------
    for col in numeric_cols:
        if df[col].nunique() > 10:
            useful_numeric.append(col)

    # -----------------------------
    # Select categorical columns with reasonable groups
    # -----------------------------
    for col in categorical_cols:
        unique_vals = df[col].nunique()
        if 2 < unique_vals < 20:
            useful_categorical.append(col)

    # -----------------------------
    # Summary Statistics
    # -----------------------------
    summary_stats = {}
    for col in useful_numeric[:5]:
        try:
            summary_stats[col] = {
                "mean": round(float(df[col].mean()), 2) if not pd.isna(df[col].mean()) else 0.0,
                "min": round(float(df[col].min()), 2) if not pd.isna(df[col].min()) else 0.0,
                "max": round(float(df[col].max()), 2) if not pd.isna(df[col].max()) else 0.0
            }
        except:
            continue

    profile = {
        "rows": len(df),
        "columns": df.shape[1],
        "all_columns": df.columns.tolist(),
        "numeric_columns": useful_numeric,
        "categorical_columns": useful_categorical,
        "datetime_columns": datetime_cols,
        "summary_stats": summary_stats
    }

    return profile

def get_column_metadata(df):
    metadata = {}

    for col in df.columns:
        col_data = df[col]
        dtype = str(col_data.dtype)
        unique_count = col_data.nunique()

        # 🔹 TYPE DETECTION
        if "int" in dtype or "float" in dtype:
            col_type = "numeric"
        elif "datetime" in dtype:
            col_type = "datetime"
        else:
            col_type = "categorical"

        # 🔹 CARDINALITY
        if unique_count < 10:
            cardinality = "low"
        elif unique_count < 50:
            cardinality = "medium"
        else:
            cardinality = "high"

        metadata[col] = {
            "type": col_type,
            "cardinality": cardinality,
            "unique_values": int(unique_count),
            "missing": int(col_data.isnull().sum())
        }

    return metadata
