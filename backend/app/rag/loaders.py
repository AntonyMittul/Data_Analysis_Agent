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

# Keep tabular files readable without exploding the vector store.
_MAX_TABLE_ROWS = 1500


def is_supported(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in SUPPORTED_DOC_EXTENSIONS


def _dataframe_to_text(df: pd.DataFrame, sheet_name: str | None = None) -> str:
    """Render a table as retrieval-friendly text: a summary plus row records."""
    df = df.copy()
    df.columns = [str(c) for c in df.columns]

    header = f"Sheet: {sheet_name}" if sheet_name else "Table data"
    lines = [
        header,
        f"Summary: {len(df)} rows, {df.shape[1]} columns.",
        f"Columns: {', '.join(df.columns)}",
    ]

    # Lightweight numeric summary so aggregate questions have something to use.
    num = df.select_dtypes("number")
    if not num.empty:
        lines.append("Numeric summary:")
        for col in num.columns[:15]:
            s = num[col].dropna()
            if len(s):
                lines.append(
                    f"  - {col}: min={s.min():.2f}, max={s.max():.2f}, "
                    f"mean={s.mean():.2f}, sum={s.sum():.2f}"
                )

    lines.append("")
    lines.append("Records:")
    shown = df.head(_MAX_TABLE_ROWS).fillna("")
    for i, (_, row) in enumerate(shown.iterrows(), start=1):
        record = "; ".join(f"{c}: {row[c]}" for c in df.columns)
        lines.append(f"Row {i}: {record}")

    if len(df) > _MAX_TABLE_ROWS:
        lines.append(f"... ({len(df) - _MAX_TABLE_ROWS} more rows not shown)")

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
