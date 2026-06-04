import numpy as np
from sklearn.linear_model import LinearRegression

def add_predictions_to_chart(chart):
    try:
        if chart.get("type") != "line":
            return chart  # only for line charts

        data = chart.get("data", [])
        x_key = chart.get("x")
        y_key = chart.get("y")

        if not data or not x_key or not y_key:
            return chart

        # Extract values
        x_values = [d[x_key] for d in data if d[y_key] is not None]
        y_values = [d[y_key] for d in data if d[y_key] is not None]

        if len(y_values) < 5:
            return chart  # not enough data

        X = np.arange(len(y_values)).reshape(-1, 1)
        y = np.array(y_values)

        model = LinearRegression()
        model.fit(X, y)

        # Predict next 20% future points
        future_steps = max(3, len(y_values) // 5)

        future_X = np.arange(len(y_values), len(y_values) + future_steps).reshape(-1, 1)
        predictions = model.predict(future_X)

        # Extend x-axis
        import pandas as pd
        try:
            pd_dates = pd.to_datetime(x_values, errors="raise")
            if len(pd_dates) > 1:
                diff = pd_dates[-1] - pd_dates[-2]
                future_dates = [pd_dates[-1] + (i * diff) for i in range(1, future_steps + 1)]
                future_x = [d.strftime('%Y-%m-%d %H:%M:%S') if ' ' in str(x_values[-1]) else d.strftime('%Y-%m-%d') for d in future_dates]
            else:
                future_x = list(range(len(y_values), len(y_values) + future_steps))
        except:
            try:
                last_x = float(x_values[-1])
                diff = float(x_values[-1]) - float(x_values[-2]) if len(x_values) > 1 else 1.0
                future_x = [last_x + (i * diff) for i in range(1, future_steps + 1)]
            except:
                future_x = list(range(len(y_values), len(y_values) + future_steps))

        # 🔥 Add prediction trace
        chart["prediction"] = {
            "x": future_x,
            "y": predictions.tolist()
        }

        return chart

    except Exception as e:
        print("[PREDICTION ERROR]:", e)
        return chart
