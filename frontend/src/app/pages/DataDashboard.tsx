import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import Plot from "react-plotly.js";
import {
  ArrowLeft,
  Upload,
  MessageCircle,
  X,
  Send,
  Loader2,
  Filter,
  BarChart2,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Database,
  Columns3,
  CheckCircle2,
  Calendar,
  Trophy,
  Check,
  Download
} from "lucide-react";

import { classifyCharts } from "../../utils/ChartClassifier";
import Markdown from "../components/Markdown";
import { ThemeToggle, useTheme } from "../components/ThemeProvider";
import { exportDashboardPdf } from "../lib/exportPdf";

// ================= TYPES =================
interface ChartData {
  title: string;
  data: any[];
  layout: any;

  // ADD THIS
  prediction?: {
    x: number[];
    y: number[];
  };
}

// ================= FIX: BACKEND → PLOTLY =================
const transformToPlotly = (chart: any) => {
  try {
    if (!chart?.data) return null;

    if (chart.type === "bar") {
      return {
        data: [{
          x: chart.data.map((d: any) => d[chart.x]),
          y: chart.data.map((d: any) => d[chart.y]),
          type: "bar"
        }],
        layout: { title: chart.title }
      };
    }

    if (chart.type === "line") {
      return {
        data: [{
          x: chart.data.map((d: any) => d[chart.x]),
          y: chart.data.map((d: any) => d[chart.y]),
          type: "scatter",
          mode: "lines"
        }],
        layout: { title: chart.title }
      };
    }

    if (chart.type === "histogram") {
      return {
        data: [{
          x: chart.data.map((d: any) => d[chart.x]),
          type: "histogram"
        }],
        layout: { title: chart.title }
      };
    }

    return null;
  } catch {
    return null;
  }
};

// ================= UI HELPERS =================

const renderMessageContent = (content: string) => {
  if (!content) return null;
  return <Markdown>{content}</Markdown>;
};

const LOADING_STEPS = [
  "Uploading dataset",
  "Identifying inconsistencies",
  "Cleaning & preprocessing",
  "Generating visuals",
];

const LoadingSequence = ({ step }: { step: number }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md mx-auto mt-10 animate-in fade-in duration-300">
    <div className="flex items-center gap-3 mb-6">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      <h3 className="text-lg font-semibold text-slate-800">Analyzing your dataset…</h3>
    </div>
    <div className="space-y-4">
      {LOADING_STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${
                done
                  ? "bg-green-500 text-white"
                  : active
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? <Check size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : i + 1}
            </span>
            <span
              className={`text-sm transition-colors ${
                done ? "text-slate-400" : active ? "text-slate-800 font-medium" : "text-slate-400"
              }`}
            >
              {label}
              {active ? "…" : ""}
            </span>
          </div>
        );
      })}
    </div>
    <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-600 transition-all duration-500 ease-out"
        style={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
      />
    </div>
  </div>
);

const KPI_ICONS: Record<string, any> = {
  database: Database,
  columns: Columns3,
  check: CheckCircle2,
  calendar: Calendar,
  trophy: Trophy,
  trending: TrendingUp,
};

const KPICard = ({ title, value, subtitle, icon }: any) => {
  const Icon = typeof icon === "string" ? KPI_ICONS[icon] || BarChart2 : icon || BarChart2;
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <Icon size={18} />
        </div>
      </div>
      <h4 className="text-2xl font-bold text-slate-800 mt-2 truncate" title={String(value)}>
        {value}
      </h4>
      {subtitle && <p className="text-xs text-slate-400 mt-1 truncate" title={subtitle}>{subtitle}</p>}
    </div>
  );
};

const ChartCard = ({ title, children, onClick }: any) => (
  <div
    onClick={onClick}
    className="bg-white p-5 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition"
  >
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    {children}
  </div>
);

// ================= MAIN COMPONENT =================

export function DataDashboard() {

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string>("");

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [dashboardInsights, setDashboardInsights] = useState<string | null>(null);

  // Advance the loading sequence while analysis runs.
  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    const id = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 1100);
    return () => clearInterval(id);
  }, [isLoading]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datasetStats, setDatasetStats] = useState<any>(null);
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const API_URL = "http://127.0.0.1:8000";
  const { dark } = useTheme();

  // Plotly layout overrides so charts blend into the light/dark theme.
  const themedPlotLayout = dark
    ? {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#cbd5e1" },
      }
    : {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      };

  // ================= ADD THESE STATES (keep with other useState) =================
  


  // ================= ADD THIS FUNCTION =================
  const fetchPreviewData = async () => {
    if (!filePath) return;

    try {
      const res = await fetch(
        `${API_URL}/preview?file_path=${encodeURIComponent(filePath)}`
      );

      const data = await res.json();

      setColumns(data.columns || []);
      setTableData(data.rows || []);
      setShowDataModal(true);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchInsights = async (path: string) => {
    try {
      const res = await fetch(`${API_URL}/insights?file_path=${encodeURIComponent(path)}`);

      if (!res.ok) return null;

      const data = await res.json();

      return data?.insights;

    } catch (err) {
      console.error("Insights fetch error:", err);
      return null;
    }
  };

// ONLY CHANGES APPLIED — UI + STRUCTURE UNTOUCHED

// ================= FIXED pollInsights =================

const pollInsights = async (path: string) => {

  const maxAttempts = 30; // increased attempts, but faster loop

  for (let i = 0; i < maxAttempts; i++) {

    const insights = await fetchInsights(path);

    if (
      insights &&
      typeof insights === "string" &&
      !insights.toLowerCase().includes("generating")
    ) {

      // ✅ SET INSIGHTS
      setDashboardInsights(insights);

      // ✅ UPDATE CHATBOT IMMEDIATELY
      setChatMessages([
        {
          role: "assistant",
          content: `I've analyzed your dataset. Here are key insights:\n\n${insights}\n\nAsk me anything about the data.`
        }
      ]);

      return;
    }

    // 🔥 FAST POLLING (KEY FIX)
    await new Promise(res => setTimeout(res, 1000)); // 1 second constant
  }

  setDashboardInsights("⚠️ Insights generation took too long. Please try again.");
};


  // ONLY FUNCTIONAL CHANGES APPLIED — UI UNTOUCHED

// ================= FILE UPLOAD =================

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

  const file = e.target.files?.[0];
  if (!file) return;

  setUploadedFile(file);
  setIsLoading(true);

  try {

    const formData = new FormData();
    formData.append("file", file);

    // 1️⃣ Upload
    const uploadRes = await fetch(`${API_URL}/upload/`, {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();
    const returnedPath = uploadData.file_path || uploadData.file_name;

    setFilePath(returnedPath);

    // 2️⃣ Analyze (FAST API)
    const analyzeRes = await fetch(
      `${API_URL}/analyze?file_path=${returnedPath}`
    );

    const analysis = await analyzeRes.json();

    setDatasetStats(analysis.dataset_stats || null);

    // ✅ FIXED: CLEAN CHART PARSING (NO UI CHANGE)
    const charts = (analysis.charts || [])
    .map((c: any) => {
      try {

        let fig = c.figure;

        if (!fig) return null;

        // 🔥 FIX: ensure valid structure
        if (!fig.data || !fig.layout) {
          console.warn("Invalid chart:", c);
          return null;
        }

        return {
          title: c.title || "Chart",
          data: fig.data,
          layout: fig.layout || {}
        };

      } catch (err) {
        console.error("Chart error:", err);
        return null;
      }
    })
    .filter(Boolean);

    console.log("BACKEND CHARTS:", analysis.charts);

    setChartData(charts);

    // ✅ FIX: Proper async insights flow
    setDashboardInsights("Generating insights...");

    // 🔥 START POLLING IMMEDIATELY (NO DELAY)
    setTimeout(() => {
      pollInsights(returnedPath);
    }, 0);

  } catch (err) {
    console.error(err);
  }

  setIsLoading(false);
};



  // ================= CHAT =================

  const handleChatSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!chatInput.trim() || !filePath) return;

    const userMessage = chatInput;

    setChatMessages(prev => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" }
    ]);

    setChatInput("");

    try {

      // ✅ FIXED ENDPOINT
      const response = await fetch(`${API_URL}/data-chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: userMessage,
          file_path: filePath,
          session_id: `data_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
        })
      });

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;

          // ================= 🔥 NEW FEATURE: CHART DETECTION =================
          if (assistantText.startsWith("__CHART__")) {
            try {
              const chartJson = JSON.parse(
                assistantText.replace("__CHART__", "")
              );

              const newChart = {
                title: "Custom Visualization",
                data: chartJson.data,
                layout: chartJson.layout
              };

              // ✅ Add chart to dashboard
              setChartData(prev => [newChart, ...prev]);

              // ✅ Show confirmation message
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: "📊 Visualization generated based on your query."
                };
                return updated;
              });

            } catch (err) {
              console.error("Chart parse error:", err);
            }

            return; // 🚀 STOP normal text flow
          }

          // ================= NORMAL TEXT FLOW =================
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantText
            };
            return updated;
          });
        }
      }

    } catch (err) {
      console.error(err);
    }
  };

  // ================= KPI =================

  const kpis = datasetStats?.cards?.length
    ? datasetStats.cards
    : datasetStats
    ? [
        { title: "Records", value: datasetStats.rows, subtitle: `${datasetStats.columns} columns`, icon: "database" },
        { title: "Dimensions", value: `${datasetStats.rows} × ${datasetStats.columns}`, icon: "columns" },
        { title: "Missing Values", value: datasetStats.missing_values, icon: "check" },
        {
          title: "Data Quality",
          value: datasetStats.missing_values > 0 ? "Needs Attention" : "Clean",
          icon: "check",
        },
      ]
    : [];

  const handleDownloadPdf = async () => {
    if (!chartData.length || isExporting) return;
    setIsExporting(true);
    try {
      await exportDashboardPdf({
        fileName: datasetStats?.file_name || "dataset",
        kpis,
        charts: chartData,
        insights: dashboardInsights,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const categorizedCharts = classifyCharts(chartData);

  

  return (

    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden relative">

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">

            {/* LEFT SIDE */}
            <div className="flex items-center gap-4">

              <Link to="/" className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5"/>
              </Link>

              <h1 className="text-2xl text-slate-800">
                Executive Dashboard
              </h1>

            </div>

            {/* ✅ RIGHT SIDE (FIXED) */}
            <div className="flex items-center gap-2">

              <ThemeToggle />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Upload className="w-4 h-4"/>
                Upload Data
              </button>

              <button
                onClick={fetchPreviewData}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                View Data
              </button>

              {chartData.length > 0 && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                  title="Download all visuals as a PDF report"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? "Preparing…" : "Download PDF"}
                </button>
              )}

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />

          </div>
        </header>


        {/* SCROLLABLE MAIN BODY */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">

          {!uploadedFile && !isLoading && (

            <div className="flex items-center justify-center h-full">

              <div className="text-center">

                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-12 h-12 text-slate-400"/>
                </div>

                <h2 className="text-2xl text-slate-700">
                  No data uploaded
                </h2>

                <p className="text-slate-500 mb-6">
                  Upload a CSV or XLSX file to generate visualizations
                </p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg"
                >
                  Upload File
                </button>

              </div>

            </div>

          )}

          {isLoading && (
            <div className="w-full mt-4">
              <LoadingSequence step={loadingStep} />
            </div>
          )}

          {/* DYNAMIC DASHBOARD */}

          {chartData.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-500 w-full">
              
              {/* Dynamic KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                  <KPICard key={idx} {...kpi} />
                ))}
              </div>

              {/* Visual Analytics Content */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Visual Analytics</h2>
                    <p className="text-sm text-slate-500 mt-1">AI-generated charts</p>
                  </div>
                </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  {chartData.map((chart, idx) => (
                <ChartCard
  key={idx}
  title={chart.title}
  onClick={() => setSelectedChart(chart)}
>
                      <Plot
  data={[
  ...chart.data,
  ...(chart.prediction
    ? [{
        x: chart.prediction.x,
        y: chart.prediction.y,
        type: "scatter",
        mode: "lines",
        name: "Forecast",
        line: { dash: "dot" }
      }]
    : [])
]}
  layout={{
    ...chart.layout,
    ...themedPlotLayout,

    title: "",

    autosize: true,

    // 🔥 FORCE HEIGHT
    height: 400,   // key fix
    width: undefined,

    margin: { l: 50, r: 20, t: 20, b: 50 },
  }}
  useResizeHandler={true}
  style={{
    width: "100%",
    height: "400px",   // 🔥 must match layout height
  }}
  config={{
    responsive: true,
    displayModeBar: false
  }}
/>
                    </ChartCard>
                  ))}
                </div>

                
              </div>
            </div>
          )}

        </main>


        {/* CHAT BUTTON */}

        {uploadedFile && (

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-full shadow-lg flex items-center justify-center z-50"
          >
            {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </button>

        )}

      </div>{/* END MAIN CONTENT AREA */}

      {/* INVISIBLE OVERLAY TO CLOSE CHAT ON CLICK OUTSIDE */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsChatOpen(false)} />
      )}

      {/* AGENT SIDE PANEL ("Ask Questions") */}
      {uploadedFile && (
        <div
          className={`fixed bottom-24 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right ${
            isChatOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
          }`}
        >

          <div className="flex flex-col h-full">

            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-md">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <h2 className="font-semibold text-slate-800">Ask Data Agent</h2>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-5 h-5"/>
              </button>

            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {chatMessages.map((message, idx) => (

                <div
                  key={idx}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                    }`}
                  >
                    {renderMessageContent(message.content)}
                  </div>

                </div>

              ))}

            </div>

            <form onSubmit={handleChatSubmit} className="border-t p-4">

              <div className="flex gap-2">

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your data..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-full bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-5 h-5"/>
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {selectedChart && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onClick={() => setSelectedChart(null)}
  >
    <div
      className="bg-white rounded-xl p-6 w-[90%] max-w-5xl shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{selectedChart.title}</h2>
        <button
          onClick={() => setSelectedChart(null)}
          className="text-gray-500 hover:text-black"
        >
          ✕
        </button>
      </div>

      <Plot
        data={selectedChart.data}
        layout={{
          ...selectedChart.layout,
          ...themedPlotLayout,
          height: 600,   // 🔥 BIG VIEW
        }}
        style={{ width: "100%", height: "600px" }}
        config={{ responsive: true }}
      />
    </div>
  </div>
)}

{showDataModal && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onClick={() => setShowDataModal(false)}
  >
    <div
      className="bg-white rounded-xl p-6 w-[95%] max-w-6xl shadow-xl overflow-auto max-h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">Dataset Preview</h2>
          <p className="text-sm text-slate-500">
            Showing first {tableData.length} rows
            {datasetStats?.rows ? ` of ${Number(datasetStats.rows).toLocaleString()}` : ""}
            {columns.length ? ` · ${columns.length} columns` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowDataModal(false)}
          className="text-slate-400 hover:text-slate-700 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="p-2 border-b border-slate-200 text-left font-semibold whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                {columns.map((col, j) => (
                  <td key={j} className="p-2 border-b border-slate-100 whitespace-nowrap">
                    {row[col] === null || row[col] === undefined ? "" : row[col].toString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

    </div>

  );

}