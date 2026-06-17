# DataSense AI

**AI-powered data analytics & document intelligence — turn raw data and documents into decisions in seconds.**

🔗 **Live demo:** https://data-analysis-agent-ai.vercel.app/

DataSense AI lets anyone — analysts, founders, consultants — drop in a spreadsheet or a
document and instantly get charts, an executive-ready summary, and an AI analyst they can
ask questions, all powered by **Google Gemini**. No setup, no data modeling, no BI expertise.

> ⚠️ The live demo runs on free Render + Gemini free tiers. The backend may take ~30–60s to
> wake from sleep on the first request, and AI responses can occasionally hit free-tier rate limits.

---

## ✨ Features

The app has two complementary tools:

### 📊 Data Dashboard
Upload a **CSV / Excel** file and get an instant, interactive executive dashboard:
- **Dataset metadata card** — name, rows, columns, size, missing values, upload & analysis time.
- **Smart KPI cards** — record count, feature-type breakdown, data quality, and a content
  highlight (time span / top category / headline metric).
- **AI Executive Summary** — a senior-analyst-style briefing (key findings with *why & impact*,
  risks, opportunities, recommended actions) generated from the data.
- **Auto visualizations** — a semantic engine that understands columns (measures vs.
  categories vs. time vs. IDs) and builds the *right* charts: category breakdowns, share pies,
  measure-by-category bars, time trends with a **linear forecast**, distributions, a correlation
  heatmap, and a sampled scatter. Charts are pre-aggregated, so they're fast even on 200k+ rows.
- **Declutter UX** — the most decision-relevant charts up front; the rest in an expandable section.
- **Global filters & drill-down** — filter by category / region / industry / year range, or
  **click any bar** to drill into it; KPIs and charts update instantly.
- **AI Data Analyst chat** — ask anything about your data, with proactive suggested questions.
- **Generate Executive Report** — a presentation-ready, multi-page **PDF** (summary + KPIs +
  charts) created entirely in the browser. Nothing is uploaded for the export.

### 📑 Document Intelligence (RAG)
Upload **PDF / Word / Excel / CSV / text** and chat with it:
- **Retrieval-augmented Q&A** — answers grounded in your document via FAISS + BM25 hybrid search.
- **Source citations** — every answer cites the **page, section, table/figure references, and
  excerpt** it used; click a citation to **jump to that page** in the built-in viewer.
- **One-click analyses** — Executive Summary, Key Insights, Risks & Concerns, Recommendations,
  Action Items, Trend Analysis, Technical Summary.
- **Hybrid advisor** — answers from the document when relevant, and falls back to professional
  sales / finance / business expertise when it isn't (clearly flagged).
- **Saved chats** — a sidebar with searchable chat history, "new chat", and per-chat
  conversation memory, so you don't repeat context.
- **Live document viewer** — PDFs/text render inline; CSV/Excel show a scrollable data table.

### 🎨 App-wide
- Light / **dark** theme toggle (persisted).
- Premium empty states with sample datasets & documents you can try in one click.
- Branded favicon and responsive, modern UI.

---

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, React Router, Plotly.js, react-markdown, jsPDF |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI / LLM** | Google Gemini via `langchain-google-genai` (chat + embeddings) |
| **RAG** | LangChain, FAISS (vector store), `rank_bm25` (keyword), hybrid rank fusion |
| **Data** | pandas, numpy, openpyxl, Plotly (server-side figure generation), scikit-learn (trend forecast) |
| **Docs** | pypdf, python-docx / docx2txt, TextLoader |
| **Database** | SQLite (chat sessions, messages & uploaded-document metadata) |
| **Deploy** | Vercel (frontend) · Render (backend) |

The whole app runs on a **single Gemini API key** (LLM + embeddings).

| Concern | Default |
| --- | --- |
| Chat / insights | `gemini-2.0-flash` (configurable via `GEMINI_MODEL`) |
| Embeddings | `models/gemini-embedding-001` |
| Vector store | FAISS, per-document |
| Retrieval | Hybrid BM25 + vector with rank fusion |

---

## 🗂️ Project Structure

```
backend/                 FastAPI service
  app/
    agents/              Structured / unstructured / routing agents
    rag/                 Loaders, chunking, embeddings, FAISS store, hybrid retriever, pipeline, citations
    routes/              API endpoints (upload, analyze, insights, chat, documents, sessions, library)
    services/            Dataset loading, profiling, visualization engine, insight generation, KPIs, filters
    config/              Settings + centralized Gemini LLM factory
    memory/              SQLite database (chat sessions, messages, document metadata)
  samples/               Bundled sample datasets & documents
  requirements.txt
frontend/                React + Vite + TypeScript + Tailwind UI
  src/app/
    pages/               Home, DataDashboard, DocumentExtraction
    components/          ThemeProvider, Markdown renderer, HomeBackground
    lib/                 API config, PDF export
render.yaml              Render Blueprint for the backend
```

---

## 🚀 Getting Started (local)

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

cp .env.example .env           # then paste your key (below)
uvicorn app.main:app --reload --port 8000
```

Get a free Gemini key at https://aistudio.google.com/app/apikey and set it in `backend/.env`:
```
GOOGLE_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash
EMBEDDING_MODEL=models/gemini-embedding-001
```
API docs: http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend defaults to the backend at `http://127.0.0.1:8000`. To point elsewhere, set
`VITE_API_URL` in a `frontend/.env` file.

---

## ☁️ Deployment

Deployed as a **split app**: frontend on Vercel, backend on Render (the FastAPI server needs an
always-on process and disk for the vector store / SQLite, which serverless can't provide).

**Backend → Render**
1. Render → **New → Blueprint** → select this repo (uses `render.yaml`).
2. In the service's **Environment**, set `GOOGLE_API_KEY` (and optionally `GEMINI_MODEL`).
3. Deploy and note the URL, e.g. `https://datasense-ai-api.onrender.com`.

**Frontend → Vercel**
1. Vercel → **New Project** → import this repo.
2. **Root Directory** = `frontend`.
3. Add env var **`VITE_API_URL`** = your Render backend URL (no trailing slash).
4. Deploy — `vercel.json` handles Vite build + SPA routing.

> Free-tier notes: Render's disk is ephemeral (uploads/indexes reset on sleep/redeploy) and the
> instance sleeps when idle. For production, add a Render persistent disk and a paid Gemini key.

---

## 🔒 Notes
- `backend/.env` is git-ignored — your API key never leaves your machine.
- `uploads/`, `vector_db/`, `sessions/`, `data/`, and `chat.db` are runtime artifacts (git-ignored).
- The PDF executive report is generated client-side, so dashboard data isn't sent anywhere to export it.

---

Built with FastAPI, React, and Google Gemini.
