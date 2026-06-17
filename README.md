# Data Analysis Agent

An agentic business-insight / data-analysis app powered by **Google Gemini**.

Upload a dataset (CSV / XLSX) or a document (PDF / DOCX) and the agent will:

- **Profile** the dataset (columns, types, summary statistics)
- **Auto-generate visualizations** (bar, pie, time-series with trend prediction) with Plotly
- **Generate business insights** (trends, issues, recommendations) with Gemini
- **Chat with your data** — ask questions answered strictly from your dataset
- **Chat with documents** — retrieval-augmented Q&A over PDFs/DOCX using FAISS + BM25 hybrid search

## Architecture

```
backend/          FastAPI service (Python)
  app/
    agents/       Structured / unstructured / routing agents
    rag/          Chunking, embeddings, FAISS vector store, hybrid retriever, RAG pipeline
    routes/       API endpoints (upload, analyze, insights, chat, documents)
    services/     Data loading, profiling, visualization, insight generation, prediction
    config/       Settings + centralized Gemini LLM factory
    memory/       File-based chat session memory
frontend/         React + Vite + TypeScript + Tailwind UI
```

Both the LLM and the embeddings run on Gemini, so the whole app needs **only one API key**.

| Concern        | Implementation                          |
| -------------- | --------------------------------------- |
| Chat / insights | `gemini-2.0-flash` (`GoogleGenerativeAI`) |
| Embeddings     | `models/text-embedding-004`             |
| Vector store   | FAISS (local, per-document)             |
| Retrieval      | Hybrid BM25 + vector with rank fusion   |

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Create your `.env` and paste your Gemini API key
(get one at https://aistudio.google.com/app/apikey):

```bash
cp .env.example .env
```

Then edit `backend/.env`:

```
GOOGLE_API_KEY=your-gemini-api-key-here
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000`.

## Notes

- `backend/.env` is git-ignored — your API key never leaves your machine.
- `uploads/`, `vector_db/`, `sessions/`, and `data/` are runtime artifacts and are git-ignored.

## Deployment

Deploy the **backend on Render** and the **frontend on Vercel** (a static SPA can't host the
FastAPI server, which needs an always-on Python process and disk for the vector store / SQLite).

### 1. Backend → Render
1. Push this repo to GitHub.
2. Render Dashboard → **New → Blueprint** → select this repo (it uses `render.yaml`).
3. After it creates the service, open **Environment** and set `GOOGLE_API_KEY` to your Gemini key.
4. Deploy. Note the service URL, e.g. `https://datasense-ai-api.onrender.com`.

> Free tier note: the disk is ephemeral, so uploaded files / vector indexes reset when the
> service sleeps or redeploys. For permanent storage, add a Render **persistent disk** (paid)
> mounted at the backend working directory.

### 2. Frontend → Vercel
1. Vercel → **New Project** → import this repo.
2. Set **Root Directory** to `frontend` (Vercel auto-detects Vite).
3. Add an environment variable **`VITE_API_URL`** = your Render backend URL (no trailing slash).
4. Deploy. `vercel.json` handles SPA routing.

That's it — the frontend calls the backend via `VITE_API_URL`; CORS is already open on the API.
