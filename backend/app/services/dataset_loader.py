import pandas as pd


def load_dataset(file_path: str, return_quality: bool = False):

    # -----------------------------
    # Load dataset
    # -----------------------------
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)

    elif file_path.endswith(".xlsx"):
        df = pd.read_excel(file_path)

    else:
        raise ValueError("Unsupported file format")

    # -----------------------------
    # Capture raw-data quality BEFORE cleaning, so the dashboard can report
    # what was actually wrong with the uploaded file.
    # -----------------------------
    quality = {
        "raw_rows": int(len(df)),
        "total_cells": int(df.size),
        "missing_cells": int(df.isnull().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
    }
    quality["missing_pct"] = (
        round(100 * quality["missing_cells"] / quality["total_cells"], 1)
        if quality["total_cells"] else 0.0
    )

    # -----------------------------
    # Remove duplicate rows
    # -----------------------------
    df = df.drop_duplicates()

    # -----------------------------
    # Drop columns with too many nulls
    # -----------------------------
    df = df.dropna(axis=1, thresh=len(df) * 0.6)

    # -----------------------------
    # Detect datetime columns safely
    # -----------------------------
    datetime_keywords = ["date", "time", "timestamp", "day", "month", "year"]

    for col in df.columns:

        if df[col].dtype == "object":

            col_lower = col.lower()

            if any(keyword in col_lower for keyword in datetime_keywords):

                try:
                    df[col] = pd.to_datetime(df[col], errors="coerce")
                except:
                    pass

    # -----------------------------
    # Fill numeric NaNs
    # -----------------------------
    numeric_cols = df.select_dtypes(include=["number"]).columns

    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())

    # -----------------------------
    # Fill categorical NaNs
    # -----------------------------
    cat_cols = df.select_dtypes(include=["object"]).columns

    for col in cat_cols:
        df[col] = df[col].fillna("Unknown")

    if return_quality:
        return df, quality
    return df