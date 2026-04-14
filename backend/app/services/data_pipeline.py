import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from visualization_engine import generate_visualizations
from data_profiler import profile_dataset

def process_data_fast(df: pd.DataFrame):
    """
    Fast processing pipeline (NO LLM here)
    """

    # ✅ Step 1: Quick summary (instant)
    summary = {
        "rows": df.shape[0],
        "columns": list(df.columns),
        "missing_values": df.isnull().sum().to_dict()
    }

    # ✅ Step 2: Run heavy tasks in parallel
    with ThreadPoolExecutor() as executor:
        future_visuals = executor.submit(generate_visualizations, df)
        future_profile = executor.submit(profile_dataset, df)

        visuals = future_visuals.result()
        profile = future_profile.result()

    return {
        "summary": summary,
        "visuals": visuals,
        "profile": profile
    }