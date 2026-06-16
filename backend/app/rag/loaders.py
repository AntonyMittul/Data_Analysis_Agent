"""Multi-format document loading for the RAG pipeline.

Turns an uploaded file (PDF / TXT / DOCX / CSV / XLSX) into a list of
LangChain ``Document`` objects that flow through the same chunk -> embed ->
FAISS pipeline regardless of the original format.
"""
import os

import pandas as pd
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
)

SUPPORTED_DOC_EXTENSIONS = {".pdf", ".txt", ".docx", ".csv", ".xlsx", ".xls"}

# Rows included as a concrete sample (the rest is summarized statistically).
_SAMPLE_ROWS = 20


def is_supported(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in SUPPORTED_DOC_EXTENSIONS


def _dataframe_to_text(df: pd.DataFrame, sheet_name: str | None = None) -> str:
    """Render a table as a compact ANALYTICAL PROFILE rather than raw rows.

    Dumping every row of a large dataset explodes the vector store and makes
    indexing slow/unreliable. Instead we build a small, information-dense
    description (schema, statistics, distributions, correlations, a sample)
    that indexes in a couple of embedding calls and lets the assistant
    describe the data and give insights/recommendations.
    """
    df = df.copy()
    df.columns = [str(c) for c in df.columns]

    header = f"Sheet '{sheet_name}'" if sheet_name else "Dataset"
    lines = [
        f"{header} analytical profile",
        f"Shape: {len(df):,} rows x {df.shape[1]} columns",
        f"Columns: {', '.join(df.columns)}",
    ]

    # Missing values
    miss = df.isnull().sum()
    miss = miss[miss > 0]
    if len(miss):
        lines.append("Missing values: " + ", ".join(f"{c}={int(n)}" for c, n in miss.items()))
    else:
        lines.append("Missing values: none")

    # Numeric statistics
    num = df.select_dtypes("number")
    if not num.empty:
        lines.append("")
        lines.append("Numeric column statistics:")
        for col in num.columns:
            s = num[col].dropna()
            if len(s):
                lines.append(
                    f"- {col}: mean={s.mean():.2f}, median={s.median():.2f}, "
                    f"std={s.std():.2f}, min={s.min():.2f}, max={s.max():.2f}, sum={s.sum():.2f}"
                )

    # Categorical distributions (low/medium cardinality only)
    cat = df.select_dtypes(exclude="number")
    cat_lines = []
    for col in cat.columns:
        nun = df[col].nunique(dropna=True)
        if 1 < nun <= 50:
            vc = df[col].value_counts().head(10)
            top = ", ".join(f"{k} ({int(v)})" for k, v in vc.items())
            cat_lines.append(f"- {col} ({nun} unique): {top}")
    if cat_lines:
        lines.append("")
        lines.append("Categorical column distributions:")
        lines.extend(cat_lines)

    # Correlations between numeric columns
    if num.shape[1] >= 2:
        corr = num.corr(numeric_only=True)
        pairs = []
        cols = corr.columns
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                v = corr.iloc[i, j]
                if pd.notnull(v) and abs(v) >= 0.5:
                    pairs.append(f"{cols[i]} & {cols[j]}: {v:.2f}")
        if pairs:
            lines.append("")
            lines.append("Notable correlations: " + "; ".join(pairs[:15]))

    # A concrete sample so specific values are available too
    lines.append("")
    lines.append(f"Sample of first {min(_SAMPLE_ROWS, len(df))} rows (CSV):")
    lines.append(df.head(_SAMPLE_ROWS).to_csv(index=False).strip())

    return "\n".join(lines)


def _load_tabular(file_path: str, ext: str):
    docs = []
    base = os.path.basename(file_path)

    if ext == ".csv":
        df = pd.read_csv(file_path)
        docs.append(Document(
            page_content=_dataframe_to_text(df),
            metadata={"source": base, "type": "csv"},
        ))
    else:  # .xlsx / .xls -> one document per sheet
        sheets = pd.read_excel(file_path, sheet_name=None)
        for sheet_name, df in sheets.items():
            if df.empty:
                continue
            docs.append(Document(
                page_content=_dataframe_to_text(df, sheet_name),
                metadata={"source": base, "type": "excel", "sheet": sheet_name},
            ))

    return docs


def load_document(file_path: str):
    """Load any supported file into a list of LangChain Documents."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return PyPDFLoader(file_path).load()

    if ext == ".txt":
        try:
            return TextLoader(file_path, encoding="utf-8").load()
        except Exception:
            return TextLoader(file_path, encoding="latin-1").load()

    if ext == ".docx":
        return Docx2txtLoader(file_path).load()

    if ext in (".csv", ".xlsx", ".xls"):
        return _load_tabular(file_path, ext)

    raise ValueError(f"Unsupported file type: {ext}")
