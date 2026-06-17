import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Send,
  FileText,
  Loader2,
  Paperclip,
  Menu,
  Plus,
  Search,
  MessageSquare,
  Trash2
} from "lucide-react";
import Markdown from "../components/Markdown";
import { ThemeToggle } from "../components/ThemeProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasDocument?: boolean;
}

const GREETING: Message = {
  role: "assistant",
  content:
    "Hello! Upload a document and get insights, predictions and recommendations. I can also help with general sales, finance, and business topics.",
};

// One-click analysis prompts shown after a document is uploaded.
const QUICK_ACTIONS = [
  { label: "Executive Summary", prompt: "Give me a concise executive summary of this document — the most important points a busy executive needs to know." },
  { label: "Key Insights", prompt: "What are the key insights from this document? List the most important findings with brief explanations." },
  { label: "Risks & Concerns", prompt: "Identify the key risks, concerns, red flags, or potential issues raised in this document." },
  { label: "Recommendations", prompt: "Based on this document, what are your professional recommendations and why?" },
  { label: "Action Items", prompt: "Extract a clear, numbered list of action items and next steps from this document." },
  { label: "Trend Analysis", prompt: "Analyze any trends, patterns, or changes over time described in this document, with supporting figures." },
  { label: "Technical Summary", prompt: "Provide a technical summary of this document, covering key methods, specifications, figures, or technical details." },
];

export function DocumentExtraction() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);

  const [input, setInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | { name: string } | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Per-chat session + saved-chat list for the sidebar.
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<any[]>([]);
  const [chatSearch, setChatSearch] = useState("");

  // 🔥 NEW STATE (already present but now used properly)
  const [showPdf, setShowPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = "http://127.0.0.1:8000";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // ================= CHAT SESSIONS =================
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/documents/sessions`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([GREETING]);
    setUploadedFile(null);
    setDocId(null);
    setShowPdf(false);
    setInput("");
  };

  const loadChat = async (sid: string) => {
    if (sid === sessionId) return;
    try {
      const res = await fetch(`${API}/documents/sessions/${sid}`);
      const data = await res.json();
      if (data.error) return;
      setSessionId(sid);
      setDocId(data.doc_id || null);
      setUploadedFile(data.doc_id && data.file_name ? { name: data.file_name } : null);
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(msgs.length ? msgs : [GREETING]);
      setShowPdf(false);
    } catch (err) {
      console.error("Failed to open chat:", err);
    }
  };

  const deleteChat = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/documents/sessions/${sid}`, { method: "DELETE" });
      if (sid === sessionId) startNewChat();
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.title || "").toLowerCase().includes(chatSearch.toLowerCase())
  );

  // ================= DATA PREVIEW (CSV / Excel reference panel) =================
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isTabular = (name?: string) => !!name && /\.(csv|xlsx|xls)$/i.test(name);

  useEffect(() => {
    const name = uploadedFile?.name;
    if (!showPdf || !isTabular(name)) return;
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`${API}/preview?file_path=${encodeURIComponent("uploads/" + name)}`);
        const data = await res.json();
        if (cancelled) return;
        setPreviewCols(data.columns || []);
        setPreviewRows(data.rows || []);
      } catch (err) {
        if (!cancelled) {
          setPreviewCols([]);
          setPreviewRows([]);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uploadedFile, showPdf]);

  // ================= FILE UPLOAD =================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsProcessing(true);

    try {
      const res = await fetch(`${API}/documents/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `⚠️ ${data.error}` }
        ]);
        return;
      }

      setUploadedFile(file);
      setDocId(data.doc_id || data.id);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `"${file.name}" uploaded successfully. I've indexed the content. What would you like to know?`,
          hasDocument: true
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Document upload failed. Please check the backend connection." }
      ]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ================= QUERY STREAMING =================
  const sendQuestion = async (raw: string) => {
    const question = raw.trim();
    if (!question || isStreaming) return;

    setInput("");

    setMessages(prev => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" }
    ]);

    setIsStreaming(true);

    try {
      const res = await fetch(`${API}/documents/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId || "",
          question: question,
          session_id: sessionId,
          file_name: (uploadedFile as any)?.name || null
        })
      });

      if (!res.ok) throw new Error("Network response was not ok");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: accumulatedText
          };
          return newMessages;
        });
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        accumulatedText += finalChunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = accumulatedText;
          return newMessages;
        });
      }

    } catch (err) {
      console.error("Stream Error:", err);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: "⚠️ The response was interrupted."
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
      // Refresh the sidebar so a newly created chat appears with its title.
      fetchSessions();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 flex items-center px-6 py-4 gap-4 sticky top-0 z-10">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          <Menu size={20} />
        </button>

        <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>

        <h1 className="text-xl font-semibold text-slate-800">
          Document Intelligence
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {uploadedFile && (
            <div
              className="flex items-center gap-2 text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full cursor-pointer hover:bg-violet-100 transition"
              onClick={() => setShowPdf(prev => !prev)} // 🔥 CLICK TO TOGGLE PDF
            >
              <FileText size={16} />
              {uploadedFile.name}
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* 🔥 SPLIT VIEW */}
      <div className="flex flex-1 overflow-hidden">

        {/* CHAT SIDEBAR */}
        <aside
          className={`${sidebarOpen ? "w-72" : "w-0"} shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-300`}
        >
          <div className="w-72 h-full flex flex-col">
            <div className="p-3 border-b border-slate-200 space-y-3">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
              >
                <Plus size={16} /> New Chat
              </button>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-6">
                  {sessions.length ? "No matching chats" : "No saved chats yet"}
                </p>
              ) : (
                filteredSessions.map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => loadChat(s.session_id)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                      s.session_id === sessionId
                        ? "bg-violet-50 text-violet-700"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <MessageSquare size={15} className="shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{s.title || "New chat"}</p>
                      {s.file_name && s.file_name !== "New chat" && (
                        <p className="truncate text-[11px] text-slate-400">{s.file_name}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteChat(s.session_id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* CHAT */}
        <main className="flex-1 overflow-y-auto px-6 py-8 transition-all">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm transition-all
                  ${message.role === "user"
                    ? "bg-violet-600 text-white rounded-tr-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"}`}
                >
                  {message.hasDocument && (
                    <div className="flex items-center gap-2 text-xs mb-2 font-semibold uppercase tracking-wider opacity-70">
                      <Paperclip size={12} />
                      Context: {uploadedFile?.name}
                    </div>
                  )}

                  <div className="leading-relaxed">
                    {message.content === "" && isStreaming ? (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : message.role === "user" ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                      <Markdown>{message.content}</Markdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* 🔥 DOCUMENT VIEWER (PDF/TXT inline, data table for CSV/Excel, fallback otherwise) */}
        {showPdf && uploadedFile && (
          <div className="w-1/2 border-l border-slate-200 bg-white overflow-hidden">
            {/\.(pdf|txt)$/i.test(uploadedFile.name) ? (
              <iframe
                src={`${API}/uploads/${encodeURIComponent(uploadedFile.name)}`}
                title="Document Viewer"
                className="w-full h-full"
              />
            ) : isTabular(uploadedFile.name) ? (
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-violet-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      Showing first {previewRows.length} rows · {previewCols.length} columns
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                      <Loader2 className="animate-spin" size={18} /> Loading data…
                    </div>
                  ) : previewRows.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      No data to preview.
                    </div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          {previewCols.map((c, i) => (
                            <th key={i} className="p-2 border-b border-slate-200 text-left font-semibold whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                            {previewCols.map((c, j) => (
                              <td key={j} className="p-2 border-b border-slate-100 whitespace-nowrap">
                                {row[c] === null || row[c] === undefined ? "" : String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <FileText size={48} className="mb-4 text-violet-400" />
                <p className="font-medium text-slate-700">{uploadedFile.name}</p>
                <p className="text-sm mt-2">
                  Inline preview isn't available for this file type, but its
                  content has been indexed — ask your questions in the chat.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="max-w-4xl mx-auto">

          {/* One-click analysis actions (shown once a document is loaded) */}
          {uploadedFile && (
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => sendQuestion(a.prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,.docx,.xlsx,.xls,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                title="Upload document"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploadedFile ? "Ask a specific question..." : "Ask anything or upload a document..."}
                disabled={isStreaming}
                className="w-full bg-slate-100 border-none rounded-2xl pl-12 pr-5 py-3 focus:ring-2 focus:ring-violet-500 outline-none transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white p-3 rounded-2xl shadow-md transition-all"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}