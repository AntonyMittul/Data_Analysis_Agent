// Base URL of the FastAPI backend.
// In production set VITE_API_URL (e.g. on Vercel) to your deployed backend URL.
// In local dev it falls back to the local server.
export const API_BASE =
  ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";
