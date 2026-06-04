import pandas as pd
import plotly.express as px
import json
from app.services.data_profiler import get_column_metadata
from app.services.predictor import add_predictions_to_chart


# ===============================
# PREPROCESSING
# ===============================
def preprocess_data(df):
    df = df.copy()
    df = df.drop_duplicates()

    for col in df.columns:
        if df[col].dtype in ["int64", "float64"]:
            df[col] = df[col].fillna(df[col].median())
        elif "datetime" in str(df[col].dtype):
            df[col] = pd.to_datetime(df[col], errors="coerce")
        else:
            df[col] = df[col].fillna("Unknown")

    return df


# ===============================
# COLUMN FILTERING
# ===============================
def is_identifier(col):
    col = col.lower()
    return "id" in col or "code" in col


def filter_columns(metadata):
    numeric = []
    categorical = []
    datetime = []

    for col, meta in metadata.items():
        if is_identifier(col):
            continue

        if meta["type"] == "numeric":
            numeric.append(col)
        elif meta["type"] == "categorical":
            categorical.append(col)
        elif meta["type"] == "datetime":
            datetime.append(col)

    return numeric, categorical, datetime


# ===============================
# VISUALIZATION ENGINE
# ===============================
def generate_visualizations(df: pd.DataFrame):
    visuals = []

    df = preprocess_data(df)
    metadata = get_column_metadata(df)

    numeric_cols, categorical_cols, datetime_cols = filter_columns(metadata)

    # ===============================
    # ✅ 1. BAR (Cleaned & Limited to Top 10)
    # ===============================
    if categorical_cols and numeric_cols:
        cat = categorical_cols[0]
        num = numeric_cols[0]

        # Group and sum, then limit to top 10 to prevent clumsy charts
        grouped = df.groupby(cat)[num].sum().reset_index()
        grouped = grouped.sort_values(by=num, ascending=False).head(10)

        fig = px.bar(
            grouped,
            x=cat,
            y=num,
            color=cat,
            title=f"Top 10 {num} by {cat}",
            color_discrete_sequence=px.colors.qualitative.Set2
        )

        fig.update_layout(
            xaxis_tickangle=-45,
            margin=dict(b=100),
            template="plotly_white"
        )

        visuals.append({
            "title": f"Top 10 {num} by {cat}",
            "figure": json.loads(fig.to_json())
        })

    # ===============================
    # ✅ 2. PIE (Grouped Beyond Top 5)
    # ===============================
    pie_cat = None
    for cat in categorical_cols:
        if metadata[cat]["cardinality"] in ["low", "medium"] and metadata[cat]["unique_values"] > 1:
            pie_cat = cat
            break
            
    if not pie_cat and categorical_cols:
        pie_cat = categorical_cols[0]

    if pie_cat:
        value_counts = df[pie_cat].value_counts().reset_index()
        value_counts.columns = [pie_cat, "count"]
        
        # Limit to top 5 and group the rest to "Other"
        if len(value_counts) > 6:
            top_5 = value_counts.head(5)
            others_count = value_counts.iloc[5:]["count"].sum()
            others_df = pd.DataFrame([{pie_cat: "Other", "count": others_count}])
            value_counts = pd.concat([top_5, others_df], ignore_index=True)

        fig = px.pie(
            value_counts,
            names=pie_cat,
            values="count",
            title=f"{pie_cat} Distribution",
            color_discrete_sequence=px.colors.qualitative.Pastel
        )

        visuals.append({
            "title": f"{pie_cat} Distribution",
            "figure": json.loads(fig.to_json())
        })

    # ===============================
    # ✅ 3. TIME SERIES + 🔥 PREDICTION (Proper Resampling & Dates)
    # ===============================
    if datetime_cols and numeric_cols:
        date = datetime_cols[0]
        num = numeric_cols[0]

        df[date] = pd.to_datetime(df[date], errors="coerce")
        df_clean = df.dropna(subset=[date])

        if not df_clean.empty:
            df_clean = df_clean.sort_values(by=date)

            min_date = df_clean[date].min()
            max_date = df_clean[date].max()
            days = (max_date - min_date).days

            if days > 365:
                freq = "ME"
            elif days > 30:
                freq = "W"
            else:
                freq = "D"

            grouped = (
                df_clean.set_index(date)
                .resample(freq)[num]
                .mean()
                .reset_index()
            )

            if len(grouped) > 1 and grouped[num].nunique() > 1:
                fig = px.line(
                    grouped,
                    x=date,
                    y=num,
                    title=f"{num} Trend Over Time"
                )

                fig.update_traces(
                    line=dict(color="#10b981", width=3),
                    mode="lines+markers"
                )

                fig.update_layout(template="plotly_white")

                fig_json = json.loads(fig.to_json())

                # Prediction structure
                chart_for_prediction = {
                    "type": "line",
                    "x": date,
                    "y": num,
                    "data": grouped.to_dict(orient="records")
                }

                # Run prediction
                chart_with_prediction = add_predictions_to_chart(chart_for_prediction)

                # Attach predictions to Plotly figure
                if "prediction" in chart_with_prediction:
                    fig_json["prediction"] = chart_with_prediction["prediction"]

                visuals.append({
                    "title": f"{num} Trend Over Time",
                    "use_case": "Shows trend after smoothing noisy data",
                    "figure": fig_json
                })

    # ===============================
    # ✅ 4. HISTOGRAM
    # ===============================
    if numeric_cols:
        col = numeric_cols[0]

        fig = px.histogram(
            df,
            x=col,
            nbins=30,
            title=f"Distribution of {col}",
            color_discrete_sequence=["#6366f1"]
        )

        visuals.append({
            "title": f"Distribution of {col}",
            "figure": json.loads(fig.to_json())
        })

    # ===============================
    # ✅ 5. TOP-N BAR (Sorted and Colored)
    # ===============================
    for cat in categorical_cols:
        if metadata[cat]["cardinality"] == "high" and numeric_cols:
            num = numeric_cols[0]

            grouped = df.groupby(cat)[num].sum().reset_index()
            grouped = grouped.sort_values(by=num, ascending=False).head(10)

            fig = px.bar(
                grouped,
                x=num,
                y=cat,
                orientation='h',
                title=f"Top 10 {cat} by {num}",
                color=cat,
                color_discrete_sequence=px.colors.qualitative.Set2
            )

            fig.update_layout(
                yaxis={'categoryorder':'total ascending'},
                template="plotly_white"
            )

            visuals.append({
                "title": f"Top 10 {cat}",
                "figure": json.loads(fig.to_json())
            })

            break

    # ===============================
    # ✅ 6. GEO MAP
    # ===============================
    geo_columns = [c for c in df.columns if "country" in c.lower() or "region" in c.lower()]

    if geo_columns and numeric_cols:
        geo = geo_columns[0]
        num = numeric_cols[0]

        grouped = df.groupby(geo)[num].sum().reset_index()

        try:
            fig = px.choropleth(
                grouped,
                locations=geo,
                locationmode="country names",
                color=num,
                title=f"{num} by {geo}"
            )

            visuals.append({
                "title": f"{num} by {geo} (Map)",
                "figure": json.loads(fig.to_json())
            })
        except:
            pass

    # ===============================
    # ✅ 7. SCATTER (Sampled for Performance)
    # ===============================
    if len(numeric_cols) >= 2:
        col1, col2 = numeric_cols[:2]
        
        scatter_df = df
        if len(df) > 1000:
            scatter_df = df.sample(1000, random_state=42)

        fig = px.scatter(
            scatter_df,
            x=col1,
            y=col2,
            color=col2,
            title=f"{col1} vs {col2}"
        )

        visuals.append({
            "title": f"{col1} vs {col2}",
            "figure": json.loads(fig.to_json())
        })

    return visuals
