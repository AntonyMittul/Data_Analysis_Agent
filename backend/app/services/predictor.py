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
        last_x = len(y_values)
        future_x = list(range(last_x, last_x + future_steps))

        # 🔥 Add prediction trace
        chart["prediction"] = {
            "x": future_x,
            "y": predictions.tolist()
        }

        return chart

    except Exception as e:
        print("[PREDICTION ERROR]:", e)
        return chart