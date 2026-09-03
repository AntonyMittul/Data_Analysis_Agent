import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  Send,
  FileText,
  Loader2,
  Paperclip,
  Menu,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  BarChart3,
  ScrollText,
  FileSearch,
  FileSpreadsheet
} from "lucide-react";
import Markdown from "../components/Markdown";
import { ThemeToggle } from "../components/ThemeProvider";
import { API_BASE } from "../lib/config";

interface Citation {
  page: number | null;
  heading?: string | null;
  refs?: string[];
  excerpt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  hasDocument?: boolean;
  citations?: Citation[];
}

const CITATIONS_MARKER = "__CITATIONS__";

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

const SAMPLE_DOCS = [
  { name: "q3_business_review.txt", label: "Q3 Business Review", desc: "Revenue, growth & risks — ask for a summary or insights" },
  { name: "company_policy.txt", label: "Company Policy", desc: "HR, leave & expense rules — ask about limits and approvals" },
];

const USE_CASES = [
  { Icon: BarChart3, title: "Financial reports", desc: "Summaries, KPIs, risks" },
  { Icon: ScrollText, title: "Policies & contracts", desc: "Rules, clauses, obligations" },
  { Icon: FileSearch, title: "Research & reports", desc: "Findings, methods, conclusions" },
  { Icon: FileSpreadsheet, title: "Spreadsheets & data", desc: "Trends, totals, comparisons" },
];

const EXAMPLE_QUESTIONS = [
  "Summarize this document in 5 bullet points",
  "What are the key risks?",
  "List the main recommendations",
  "What are the most important numbers?",
];

function ProcessingState() {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="animate-spin text-[#ff5a1f]" size={20} />
        <p className="font-medium text-slate-700">Reading &amp; indexing your document…</p>
      </div>
      <div className="space-y-3 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-24 bg-slate-100 rounded-xl mt-4" />
        <div className="h-24 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

function DocEmptyState({
  onUseSample,
  onExample,
  onUpload,
}: {
  onUseSample: (name: string, label: string) => void;
  onExample: (q: string) => void;
  onUpload: () => void;
}) {
  return (
    <div className="w-full max-w-[1200px] mx-auto py-4 relative">
      
      {/* Background Left Graphic */}
      <div className="hidden lg:block absolute left-0 top-0 w-64 h-64 pointer-events-none opacity-40">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Document Base */}
          <rect x="20" y="20" width="120" height="160" rx="8" fill="white" stroke="#ff5a1f" strokeWidth="2" strokeDasharray="4 4" opacity="0.3"/>
          <rect x="30" y="30" width="120" height="160" rx="8" fill="white" stroke="#ff5a1f" strokeWidth="2" strokeOpacity="0.5"/>
          {/* Pie Chart */}
          <circle cx="90" cy="80" r="25" fill="none" stroke="#ffcbb5" strokeWidth="12" />
          <path d="M90 55 A 25 25 0 0 1 115 80 L90 80 Z" fill="#ff5a1f" />
          {/* Bar Chart */}
          <rect x="45" y="140" width="12" height="30" rx="2" fill="#ffcbb5" />
          <rect x="65" y="120" width="12" height="50" rx="2" fill="#ff885c" />
          <rect x="85" y="130" width="12" height="40" rx="2" fill="#ff5a1f" />
          <rect x="105" y="100" width="12" height="70" rx="2" fill="#ffebd6" />
          {/* Dots */}
          <circle cx="160" cy="40" r="2" fill="#ff5a1f" opacity="0.4" />
          <circle cx="170" cy="40" r="2" fill="#ff5a1f" opacity="0.4" />
          <circle cx="180" cy="40" r="2" fill="#ff5a1f" opacity="0.4" />
          <circle cx="160" cy="50" r="2" fill="#ff5a1f" opacity="0.4" />
          <circle cx="170" cy="50" r="2" fill="#ff5a1f" opacity="0.4" />
          <circle cx="180" cy="50" r="2" fill="#ff5a1f" opacity="0.4" />
        </svg>
      </div>

      {/* Background Right Graphic */}
      <div className="hidden lg:block absolute right-0 top-10 w-72 h-64 pointer-events-none opacity-40">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top Bubble */}
          <rect x="80" y="20" width="100" height="60" rx="12" fill="white" stroke="#ff5a1f" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M120 80 L110 95 L130 80 Z" fill="white" stroke="#ff5a1f" strokeWidth="2" strokeOpacity="0.3" />
          <rect x="95" y="40" width="70" height="6" rx="3" fill="#ffcbb5" />
          <rect x="95" y="55" width="50" height="6" rx="3" fill="#ff5a1f" opacity="0.5" />
          {/* Small Bubble */}
          <rect x="130" y="90" width="50" height="40" rx="12" fill="#ff5a1f" />
          <path d="M140 130 L135 140 L150 130 Z" fill="#ff5a1f" />
          <circle cx="145" cy="110" r="2.5" fill="white" />
          <circle cx="155" cy="110" r="2.5" fill="white" />
          <circle cx="165" cy="110" r="2.5" fill="white" />
          {/* Line Chart */}
          <path d="M20 160 L60 140 L100 150 L140 100 L180 120" fill="none" stroke="#ffcbb5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 160 L60 140 L100 150 L140 100 L180 120 L180 180 L20 180 Z" fill="url(#grad)" opacity="0.3" />
          <defs>
            <linearGradient id="grad" x1="0" y1="100" x2="0" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff5a1f" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="text-center relative z-10 max-w-2xl mx-auto">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#fff0eb] text-[#ff5a1f] flex items-center justify-center mx-auto mb-4 lg:mb-6">
          <FileText size={24} />
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">
          Chat with your <span className="text-[#ff5a1f]">documents</span>
        </h2>
        <p className="text-sm lg:text-base text-slate-500 mt-3 lg:mt-4 max-w-lg mx-auto font-medium">
          Upload a PDF, Word, Excel, CSV or text file and ask questions — answers come
          with cited sources. I can also help with general business, finance and sales topics.
        </p>
        <button
          onClick={onUpload}
          className="mt-4 lg:mt-6 inline-flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3 bg-[#ff5a1f] text-white font-semibold rounded-xl hover:bg-[#e04812] transition-colors shadow-[0_8px_20px_rgba(255,90,31,0.25)] hover:shadow-[0_12px_24px_rgba(255,90,31,0.3)] hover:-translate-y-0.5 active:translate-y-0 duration-200"
        >
          <Plus size={18} strokeWidth={2.5} /> Upload a document
        </button>
      </div>

      <div className="mt-8 lg:mt-12 max-w-3xl mx-auto relative z-10 px-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Or try a sample document</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SAMPLE_DOCS.map((s) => (
            <button
              key={s.name}
              onClick={() => onUseSample(s.name, s.label)}
              className="text-left p-5 rounded-xl border border-slate-200 bg-white hover:border-[#ff5a1f]/50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#fff0eb] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={20} className="text-[#ff5a1f]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-800 group-hover:text-[#ff5a1f] transition-colors flex items-center justify-between">
                  {s.label}
                  <ChevronRight size={16} className="text-[#ff5a1f] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 lg:mt-8 max-w-3xl mx-auto relative z-10 px-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">What you can do</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {USE_CASES.map((u) => (
            <div key={u.title} className="p-4 lg:p-5 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow">
              <u.Icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#ff5a1f] mb-2 lg:mb-3" strokeWidth={2.5} />
              <p className="font-bold text-slate-800 text-xs lg:text-sm mb-1">{u.title}</p>
              <p className="text-[10px] lg:text-xs text-slate-500">{u.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 lg:mt-8 max-w-3xl mx-auto relative z-10 px-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Example questions</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onExample(q)}
              className="text-xs font-medium px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-[#fff0eb] hover:text-[#ff5a1f] hover:border-[#ff5a1f]/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Document viewer panel state
  const [showPdf, setShowPdf] = useState(false);
  const [pdfPage, setPdfPage] = useState<number | null>(null);

  // Jump the document viewer to a cited page.
  const jumpToCitation = (c: Citation) => {
    setShowPdf(true);
    if (c.page) setPdfPage(c.page);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = API_BASE;

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

  // ================= SAMPLE DOCUMENT =================
  const useSample = async (name: string, label: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API}/documents/use-sample`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
        return;
      }
      setUploadedFile({ name: data.file_name || name });
      setDocId(data.doc_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `"${label}" loaded and indexed. Ask anything, use a quick action, or click a cited source to jump into the document.`,
          hasDocument: true,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Could not load the sample document." }]);
    } finally {
      setIsProcessing(false);
    }
  };

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

      // Split the human-readable answer from the trailing citations payload.
      const applyChunk = (text: string) => {
        const idx = text.indexOf(CITATIONS_MARKER);
        const content = idx >= 0 ? text.slice(0, idx) : text;
        let citations: Citation[] | undefined;
        if (idx >= 0) {
          try {
            citations = JSON.parse(text.slice(idx + CITATIONS_MARKER.length));
          } catch {
            citations = undefined;
          }
        }
        setMessages(prev => {
          const m = [...prev];
          const i = m.length - 1;
          m[i] = { ...m[i], content: content.trimEnd(), ...(citations ? { citations } : {}) };
          return m;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value, { stream: true });
        applyChunk(accumulatedText);
      }

      accumulatedText += decoder.decode();
      applyChunk(accumulatedText);

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
              className="flex items-center gap-2 text-sm font-medium text-[#ff5a1f] bg-[#fff0eb] px-3 py-1 rounded-full cursor-pointer hover:bg-[#ffe4d6] transition"
              onClick={() => setShowPdf(prev => !prev)} // toggle the document viewer
            >
              <FileText size={16} />
              {uploadedFile.name}
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* SPLIT VIEW */}
      <div className="flex flex-1 overflow-hidden">

        {/* CHAT SIDEBAR */}
        <aside
          className={`${sidebarOpen ? "w-72" : "w-0"} shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-300`}
        >
          <div className="w-72 h-full flex flex-col">
            <div className="p-3 border-b border-slate-200 space-y-3">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#ff5a1f] text-white rounded-lg hover:bg-[#e04812] text-sm font-medium"
              >
                <Plus size={16} /> New Chat
              </button>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5a1f]"
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
                        ? "bg-[#fff0eb] text-[#e04812]"
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
        <main className={`flex-1 overflow-y-auto transition-all ${(!uploadedFile && messages.length <= 1 && !isProcessing) ? 'p-0 flex flex-col justify-center' : 'px-6 py-8'}`}>
          <div className={`mx-auto ${(!uploadedFile && messages.length <= 1 && !isProcessing) ? 'w-full max-w-[1200px]' : 'max-w-4xl space-y-6'}`}>
            {isProcessing ? (
              <ProcessingState />
            ) : !uploadedFile && messages.length <= 1 ? (
              <DocEmptyState
                onUseSample={useSample}
                onExample={(q) => setInput(q)}
                onUpload={() => fileInputRef.current?.click()}
              />
            ) : (
            messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm transition-all
                  ${message.role === "user"
                    ? "bg-[#ff5a1f] text-white rounded-tr-none"
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

                  {/* Source citations */}
                  {message.role === "assistant" && message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Sources
                      </p>
                      <div className="space-y-2">
                        {message.citations.map((c, ci) => (
                          <button
                            key={ci}
                            onClick={() => jumpToCitation(c)}
                            className="block w-full text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#fff0eb] hover:border-[#ff5a1f]/30 transition-colors p-2"
                            title={c.page ? `Jump to page ${c.page}` : "Open document"}
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#e04812]">
                              {c.page && (
                                <span className="px-2 py-0.5 rounded-full bg-[#ffe4d6]">Page {c.page}</span>
                              )}
                              {c.heading && <span className="text-slate-600 truncate max-w-[220px]">{c.heading}</span>}
                              {c.refs && c.refs.map((r) => (
                                <span key={r} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r}</span>
                              ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.excerpt}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* DOCUMENT VIEWER (PDF/TXT inline, data table for CSV/Excel, fallback otherwise) */}
        {showPdf && uploadedFile && (
          <div className="w-1/2 border-l border-slate-200 bg-white overflow-hidden">
            {/\.(pdf|txt)$/i.test(uploadedFile.name) ? (
              <iframe
                key={`${uploadedFile.name}-${pdfPage ?? 1}`}
                src={`${API}/uploads/${encodeURIComponent(uploadedFile.name)}${
                  /\.pdf$/i.test(uploadedFile.name) && pdfPage ? `#page=${pdfPage}` : ""
                }`}
                title="Document Viewer"
                className="w-full h-full"
              />
            ) : isTabular(uploadedFile.name) ? (
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-[#ff5a1f] shrink-0" />
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
                <FileText size={48} className="mb-4 text-[#ff5a1f]/60" />
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
                  className="text-xs px-3 py-1.5 rounded-full border border-[#ff5a1f]/20 text-[#e04812] bg-[#fff0eb] hover:bg-[#ffe4d6] disabled:opacity-50 transition-colors"
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
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-[#ff5a1f] hover:bg-[#ffe4d6] rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploadedFile ? "Ask a specific question..." : "Ask anything or upload a document..."}
                disabled={isStreaming}
                className="w-full bg-slate-100 border-none rounded-2xl pl-12 pr-5 py-3 focus:ring-2 focus:ring-[#ff5a1f] outline-none transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-[#ff5a1f] hover:bg-[#e04812] disabled:bg-slate-300 text-white p-3 rounded-2xl shadow-md transition-all"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}