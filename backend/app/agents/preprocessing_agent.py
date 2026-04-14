import pandas as pd


class DataPreprocessingAgent:

    def __init__(self, df: pd.DataFrame):
        self.df = df

    def clean_column_names(self):
        self.df.columns = (
            self.df.columns
            .str.strip()
            .str.lower()
            .str.replace(" ", "_")
        )

    def remove_duplicates(self):
        self.df = self.df.drop_duplicates()

    def handle_missing_values(self):

        numeric_cols = self.df.select_dtypes(include="number").columns
        categorical_cols = self.df.select_dtypes(include="object").columns

        for col in numeric_cols:
            self.df[col] = self.df[col].fillna(self.df[col].median())

        for col in categorical_cols:
            self.df[col] = self.df[col].fillna("Unknown")

    def remove_outliers(self):

        numeric_cols = self.df.select_dtypes(include="number").columns

        for col in numeric_cols:

            q1 = self.df[col].quantile(0.25)
            q3 = self.df[col].quantile(0.75)

            iqr = q3 - q1

            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr

            self.df = self.df[
                (self.df[col] >= lower) &
                (self.df[col] <= upper)
            ]

    def run(self):

        self.clean_column_names()

        self.remove_duplicates()

        self.handle_missing_values()

        self.remove_outliers()

        return self.df