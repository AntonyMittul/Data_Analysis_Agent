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

    profile = {
        "rows": len(df),
        "columns": df.shape[1],
        "numeric_columns": useful_numeric,
        "categorical_columns": useful_categorical,
        "datetime_columns": datetime_cols
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

