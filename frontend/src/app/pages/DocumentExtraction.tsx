import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Upload,
  Send,
  FileText,
  Loader2,
  Paperclip,
  Menu,
  AlertCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasDocument?: boolean;
}

export function DocumentExtraction() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! Upload a PDF or DOCX document and ask questions about it."
    }
  ]);

  const [input, setInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | { name: string } | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔥 NEW STATE (already present but now used properly)
  const [showPdf, setShowPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = "http://127.0.0.1:8000";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isStreaming) return;

    const question = input;
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
          question: question
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
    }
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

        {uploadedFile && (
          <div
            className="ml-auto flex items-center gap-2 text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full cursor-pointer hover:bg-violet-100 transition"
            onClick={() => setShowPdf(prev => !prev)} // 🔥 CLICK TO TOGGLE PDF
          >
            <FileText size={16} />
            {uploadedFile.name}
          </div>
        )}
      </header>

      {/* 🔥 SPLIT VIEW */}
      <div className="flex flex-1 overflow-hidden">

        {/* CHAT */}
        <main className={`${showPdf ? "w-1/2" : "w-full"} overflow-y-auto px-6 py-8 transition-all`}>
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

                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content === "" && isStreaming ? (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* 🔥 PDF VIEWER */}
        {showPdf && uploadedFile && (
          <div className="w-1/2 border-l border-slate-200 bg-white">
            <iframe
              src={`${API}/uploads/${uploadedFile.name}`}
              title="PDF Viewer"
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
              title="Upload Document"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={uploadedFile ? "Ask a specific question..." : "Ask anything or upload a document..."}
              disabled={isStreaming}
              className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-violet-500 outline-none transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white p-4 rounded-2xl shadow-md transition-all"
            >
              <Send size={20} />
            </button>
          </form>

          {!uploadedFile && (
            <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
              <AlertCircle size={12} /> Upload a document for deeper insights (optional).
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}