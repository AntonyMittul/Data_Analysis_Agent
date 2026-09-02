import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import Plot from "react-plotly.js";
import {
  ArrowLeft,
  ArrowRight,
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
  Download,
  Sparkles,
  ChevronDown
} from "lucide-react";

import { classifyCharts } from "../../utils/ChartClassifier";
import Markdown from "../components/Markdown";
import { ThemeToggle, useTheme } from "../components/ThemeProvider";
import { exportDashboardPdf } from "../lib/exportPdf";
import { API_BASE } from "../lib/config";
import EvalSummary from "../components/EvalSummary";

// ================= TYPES =================
interface ChartData {
  title: string;
  data: any[];
  layout: any;
  category?: string; // column used on the x-axis (enables click-to-filter drill-down)

  // ADD THIS
  prediction?: {
    x: number[];
    y: number[];
  };
}

// ================= BACKEND CHART → PLOTLY =================
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

const SUGGESTED_QUESTIONS = [
  "What are the top 3 trends?",
  "Where are the biggest risks?",
  "What should we focus on next?",
  "Summarize performance in one line",
];

const SAMPLE_DATASETS = [
  { name: "Retail Sales", path: "samples/retail_sales.csv", desc: "Revenue, units & profit by region and product category" },
  { name: "Marketing Campaigns", path: "samples/marketing_campaigns.csv", desc: "Spend, conversions & ROI across channels" },
];

const formatSize = (kb?: number) => {
  if (!kb && kb !== 0) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

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

  const [uploadedFile, setUploadedFile] = useState<File | { name: string } | null>(null);
  const [filePath, setFilePath] = useState<string>("");
  const [uploadedAt, setUploadedAt] = useState<string>("");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>("");

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  // Global filters & drill-down
  const [filterOptions, setFilterOptions] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [ranges, setRanges] = useState<Record<string, [number, number]>>({});
  const [isFiltering, setIsFiltering] = useState(false);
  const [summaryStale, setSummaryStale] = useState(false);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const API_URL = API_BASE;
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

      // SET INSIGHTS
      setDashboardInsights(insights);

      // Seed the chat intro only if the user hasn't started chatting yet
      // (so refreshing the summary doesn't wipe an ongoing conversation).
      setChatMessages((prev) =>
        prev.length > 1
          ? prev
          : [
              {
                role: "assistant",
                content:
                  "I've analyzed your dataset and prepared an **executive summary** above. Ask me anything — trends, specific numbers, comparisons, or what to do next.",
              },
            ]
      );

      return;
    }

    // Poll until the insights are ready.
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
  setUploadedAt(new Date().toLocaleString());
  setIsLoading(true);

  try {

    const formData = new FormData();
    formData.append("file", file);

    // 1. Upload
    const uploadRes = await fetch(`${API_URL}/upload/`, {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();
    const returnedPath = uploadData.file_path || uploadData.file_name;

    setFilePath(returnedPath);

    // Fresh upload → clear any prior filters, then analyze (with summary).
    setFilters({});
    setRanges({});
    await runAnalysis(returnedPath, null, true);

  } catch (err) {
    console.error(err);
  }

  setIsLoading(false);
};

// Re-usable analyze call. `withInsights` controls whether the executive
// summary is regenerated (true on upload / explicit refresh; false on filter
// changes, which only update charts + KPIs so they stay instant and free).
const runAnalysis = async (
  path: string,
  spec: { filters?: Record<string, string>; ranges?: Record<string, [number, number]> } | null,
  withInsights: boolean
) => {
  try {
    const hasSpec =
      spec && ((spec.filters && Object.keys(spec.filters).length) ||
               (spec.ranges && Object.keys(spec.ranges).length));
    const q = hasSpec ? `&filters=${encodeURIComponent(JSON.stringify(spec))}` : "";
    const insParam = withInsights ? "" : "&with_insights=false";

    const res = await fetch(`${API_URL}/analyze?file_path=${path}${q}${insParam}`);
    const analysis = await res.json();

    setDatasetStats(analysis.dataset_stats || null);
    if (analysis.filter_options) setFilterOptions(analysis.filter_options);

    const charts = (analysis.charts || [])
      .map((c: any) => {
        const fig = c.figure;
        if (!fig || !fig.data || !fig.layout) return null;
        return {
          title: c.title || "Chart",
          data: fig.data,
          layout: fig.layout || {},
          category: c.category,
        };
      })
      .filter(Boolean);

    setChartData(charts);
    setLastAnalyzedAt(new Date().toLocaleString());

    if (withInsights) {
      setSummaryStale(false);
      setDashboardInsights("Generating insights...");
      setTimeout(() => pollInsights(path), 0);
    } else {
      // Keep the existing summary but flag it as out of date for the new filter.
      setSummaryStale(true);
    }
  } catch (err) {
    console.error("Analysis failed:", err);
  }
};

// Load one of the bundled sample datasets straight from the server (no upload).
const analyzeSample = async (path: string, name: string) => {
  setUploadedFile({ name });
  setFilePath(path);
  setUploadedAt(new Date().toLocaleString());
  setFilters({});
  setRanges({});
  setIsLoading(true);
  try {
    await runAnalysis(path, null, true);
  } finally {
    setIsLoading(false);
  }
};

const refreshSummary = async () => {
  if (!filePath || refreshingSummary) return;
  setRefreshingSummary(true);
  setSummaryStale(false);
  setDashboardInsights("Generating insights...");
  try {
    await fetch(`${API_URL}/insights/refresh?file_path=${filePath}`);
    pollInsights(filePath);
  } catch (err) {
    console.error("Summary refresh failed:", err);
  } finally {
    setRefreshingSummary(false);
  }
};

// Apply the current filter/range selection (called on filter change & drill-down).
const applyFilters = async (
  nextFilters: Record<string, string>,
  nextRanges: Record<string, [number, number]>
) => {
  if (!filePath) return;
  setIsFiltering(true);
  try {
    await runAnalysis(filePath, { filters: nextFilters, ranges: nextRanges }, false);
  } finally {
    setIsFiltering(false);
  }
};

const setCategoricalFilter = (col: string, value: string) => {
  const next = { ...filters };
  if (!value) delete next[col];
  else next[col] = value;
  setFilters(next);
  applyFilters(next, ranges);
};

const setRangeFilter = (col: string, lo: number, hi: number) => {
  const next = { ...ranges, [col]: [lo, hi] as [number, number] };
  setRanges(next);
  applyFilters(filters, next);
};

const clearFilters = () => {
  setFilters({});
  setRanges({});
  applyFilters({}, {});
};

// Drill-down: clicking a bar/slice filters the whole dashboard to that value.
const handleChartClick = (chart: ChartData, event: any) => {
  if (!chart.category || !event?.points?.length) return;
  const pt = event.points[0];
  const value = pt.x ?? pt.label;
  if (value === undefined || value === null) return;
  setCategoricalFilter(chart.category, String(value));
};



  // ================= CHAT =================

  const sendMessage = async (text: string) => {

    const userMessage = text.trim();

    if (!userMessage || !filePath) return;

    setChatMessages(prev => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" }
    ]);

    setChatInput("");

    try {

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

          // ================= CHART DETECTION =================
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

              // Add chart to dashboard
              setChartData(prev => [newChart, ...prev]);

              // Show confirmation message
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: "Visualization generated based on your query."
                };
                return updated;
              });

            } catch (err) {
              console.error("Chart parse error:", err);
            }

            return; // chart handled — skip the normal text rendering
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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
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
        evaluation: evalResult,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const categorizedCharts = classifyCharts(chartData);

  // Declutter: show the first few (most decision-relevant) charts up front,
  // tuck the rest into an expandable "Advanced analytics" section.
  const primaryCharts = chartData.slice(0, 4);
  const advancedCharts = chartData.slice(4);

  const summaryReady =
    !!dashboardInsights && !dashboardInsights.toLowerCase().includes("generating");

  const renderChart = (chart: ChartData, idx: number) => (
    <ChartCard
      key={idx}
      title={chart.title}
      onClick={chart.category ? undefined : () => setSelectedChart(chart)}
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
                line: { dash: "dot" },
              }]
            : []),
        ]}
        layout={{
          ...chart.layout,
          ...themedPlotLayout,
          title: "",
          autosize: true,
          height: 400,
          width: undefined,
          margin: { l: 50, r: 20, t: 20, b: 50 },
        }}
        useResizeHandler={true}
        onClick={chart.category ? (e: any) => handleChartClick(chart, e) : undefined}
        style={{ width: "100%", height: "400px" }}
        config={{ responsive: true, displayModeBar: false }}
      />
      {chart.category && (
        <p className="text-xs text-slate-400 mt-1">
          Tip: click a bar to filter by {chart.category.replace(/_/g, " ")}
        </p>
      )}
    </ChartCard>
  );

  

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

              {chartData.length > 0 && (
                <h1 className="text-2xl text-slate-800">
                  Executive Dashboard
                </h1>
              )}

            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-2">

              <ThemeToggle />

              {chartData.length > 0 && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4"/>
                    Analyze Dataset
                  </button>

                  <button
                    onClick={fetchPreviewData}
                    className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Explore Data
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                    title="Generate a presentation-ready executive report (PDF)"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? "Generating…" : "Generate Executive Report"}
                  </button>
                </>
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

            <div className="flex items-center justify-center min-h-[80vh] relative w-full overflow-hidden">
              
              {/* Background abstract elements (similar to the image) */}
              {/* Faint dots pattern */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ff5a1f 1.5px, transparent 1.5px)', backgroundSize: '36px 36px', opacity: 0.15 }}></div>
              
              {/* Grid layout for Desktop, Stacked for Mobile */}
              <div className="relative z-10 w-full max-w-[1400px] px-4 flex flex-col xl:flex-row items-center justify-between gap-10">
                
                {/* Left Floating Widgets */}
                <div className="hidden xl:flex flex-col gap-6 w-[320px] shrink-0">
                  {/* Revenue Trend Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none">
                    <div className="text-xs text-slate-500 font-medium mb-1">Revenue Trend</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">$245,600</div>
                    <div className="text-xs font-semibold text-green-500 mt-0.5">▲ 16.4%</div>
                    
                    <div className="h-28 w-full mt-4 relative">
                      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,35 L20,25 L40,30 L60,15 L80,20 L100,5 L100,40 L0,40 Z" fill="url(#rev-grad)" />
                        <polyline points="0,35 20,25 40,30 60,15 80,20 100,5" fill="none" stroke="#ff5a1f" strokeWidth="1.5" />
                        <circle cx="0" cy="35" r="2.5" fill="#ff5a1f" />
                        <circle cx="20" cy="25" r="2.5" fill="#ff5a1f" />
                        <circle cx="40" cy="30" r="2.5" fill="#ff5a1f" />
                        <circle cx="60" cy="15" r="2.5" fill="#ff5a1f" />
                        <circle cx="80" cy="20" r="2.5" fill="#ff5a1f" />
                        <circle cx="100" cy="5" r="2.5" fill="#ff5a1f" />
                      </svg>
                      {/* X-axis labels mock */}
                      <div className="flex justify-between text-[8px] text-slate-400 mt-2 font-medium">
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales by Region Donut Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none flex items-center gap-6">
                     <div className="flex-1 text-left">
                       <div className="text-xs text-slate-500 font-medium mb-4">Sales by Region</div>
                       <div className="w-20 h-20 rounded-full border-8 border-[#ff5a1f] border-t-[#ffcbb5] border-l-[#ffcbb5] relative shrink-0">
                         {/* pseudo donut hole */}
                       </div>
                     </div>
                     <div className="flex-1 flex flex-col gap-3 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                       <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ff5a1f]"></div>North America</div><span>40%</span></div>
                       <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ff885c]"></div>Europe</div><span>30%</span></div>
                       <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ffb599]"></div>Asia</div><span>20%</span></div>
                       <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ffebd6]"></div>Others</div><span>10%</span></div>
                     </div>
                  </div>
                </div>

                {/* Center Content */}
                <div className="flex-1 max-w-[650px] text-center flex flex-col items-center pb-12">
                  
                  {/* Central Icon */}
                  <div className="w-32 h-24 mb-6 text-[#ff5a1f]">
                    <svg viewBox="0 0 100 80" className="w-full h-full" fill="currentColor">
                      <rect x="15" y="40" width="12" height="30" rx="3" />
                      <rect x="35" y="20" width="12" height="50" rx="3" />
                      <rect x="55" y="30" width="12" height="40" rx="3" />
                      <rect x="75" y="10" width="12" height="60" rx="3" />
                      <polyline points="21,30 41,10 61,20 81,0" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="21" cy="30" r="3.5" />
                      <circle cx="41" cy="10" r="3.5" />
                      <circle cx="61" cy="20" r="3.5" />
                      <circle cx="81" cy="0" r="3.5" />
                    </svg>
                  </div>

                  <h1 className="text-5xl md:text-[4rem] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
                    Turn your <span className="text-[#ff5a1f]">data</span><br/>
                    into <span className="text-[#ff5a1f]">decisions</span>
                  </h1>

                  <p className="text-lg text-slate-600 dark:text-slate-400 mt-6 mb-10 max-w-[500px] mx-auto font-medium leading-relaxed">
                    Upload a CSV to begin analysis — your AI analyst will profile it,
                    surface key trends, and build an interactive executive dashboard in seconds.
                  </p>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-[#ff5a1f] text-white font-semibold text-lg rounded-xl hover:bg-[#e04812] transition-colors shadow-[0_8px_20px_rgba(255,90,31,0.25)] hover:shadow-[0_12px_24px_rgba(255,90,31,0.3)] hover:-translate-y-0.5 active:translate-y-0 duration-200"
                  >
                    <Upload className="w-5 h-5" strokeWidth={2.5} />
                    Analyze Dataset
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-4 w-full max-w-[500px] mt-12 mb-8">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Or try a sample dataset</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  </div>

                  {/* Sample datasets */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[580px]">
                    {SAMPLE_DATASETS.map((s) => (
                      <button
                        key={s.path}
                        onClick={() => analyzeSample(s.path, s.name)}
                        className="flex-1 flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#ff5a1f]/50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#fff0eb] dark:bg-[#ff5a1f]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <BarChart2 size={16} className="text-[#ff5a1f]" />
                          </div>
                          <div>
                            <div className="font-bold text-[13px] text-slate-800 dark:text-slate-100 group-hover:text-[#ff5a1f] transition-colors">{s.name}</div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-tight">{s.desc}</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[#ff5a1f] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-2 shrink-0" />
                      </button>
                    ))}
                  </div>

                </div>

                {/* Right Floating Widgets */}
                <div className="hidden xl:flex flex-col gap-6 w-[320px] shrink-0">
                  {/* Top Products Bar Chart */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none">
                    <div className="text-xs text-slate-500 font-medium mb-6">Top Products</div>
                    <div className="space-y-5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-3">
                        <div className="w-16">Product A</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-[#ff5a1f] rounded-full" style={{width: '90%'}}></div></div>
                        <div className="w-12 text-right">$68,420</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16">Product B</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-[#ff885c] rounded-full" style={{width: '70%'}}></div></div>
                        <div className="w-12 text-right">$52,310</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16">Product C</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-[#ffb599] rounded-full" style={{width: '45%'}}></div></div>
                        <div className="w-12 text-right">$31,200</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16">Product D</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-[#ffebd6] rounded-full" style={{width: '25%'}}></div></div>
                        <div className="w-12 text-right">$18,760</div>
                      </div>
                    </div>
                  </div>

                  {/* Right side lower widget (scatter plot mock) */}
                  <div className="w-full h-32 mt-6 relative opacity-60">
                     <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                       <line x1="10" y1="90" x2="10" y2="10" stroke="#cbd5e1" strokeWidth="0.5" />
                       <line x1="10" y1="90" x2="90" y2="90" stroke="#cbd5e1" strokeWidth="0.5" />
                       
                       <circle cx="20" cy="80" r="1.5" fill="#ff5a1f" opacity="0.4" />
                       <circle cx="30" cy="70" r="1.5" fill="#ff5a1f" opacity="0.6" />
                       <circle cx="40" cy="85" r="1.5" fill="#ff5a1f" opacity="0.5" />
                       <circle cx="45" cy="50" r="2" fill="#ff5a1f" opacity="0.7" />
                       <circle cx="55" cy="60" r="1.5" fill="#ff5a1f" opacity="0.5" />
                       <circle cx="65" cy="40" r="2" fill="#ff5a1f" opacity="0.8" />
                       <circle cx="70" cy="30" r="2.5" fill="#ff5a1f" opacity="0.9" />
                       <circle cx="85" cy="20" r="2.5" fill="#ff5a1f" opacity="1" />
                     </svg>
                  </div>
                </div>

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

              {/* Dataset metadata */}
              {datasetStats && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={16} className="text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Dataset</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
                    {[
                      { label: "Name", value: datasetStats.file_name },
                      { label: "Rows", value: Number(datasetStats.rows || 0).toLocaleString() },
                      { label: "Columns", value: datasetStats.columns },
                      { label: "Size", value: formatSize(datasetStats.size_kb) },
                      { label: "Missing Values", value: Number(datasetStats.missing_values || 0).toLocaleString() },
                      { label: "Uploaded", value: uploadedAt || "—" },
                      { label: "Last Analyzed", value: lastAnalyzedAt || "—" },
                    ].map((m) => (
                      <div key={m.label} className="min-w-0">
                        <p className="text-xs text-slate-400">{m.label}</p>
                        <p className="font-semibold text-slate-800 truncate" title={String(m.value)}>
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Evaluation scores (additive trust layer) */}
              <EvalSummary
                filePath={filePath}
                signature={`${chartData.length}-${(dashboardInsights || "").length}-${summaryReady}`}
                onResult={setEvalResult}
              />

              {/* Global Filters */}
              {filterOptions &&
                (Object.keys(filterOptions.categorical || {}).length > 0 ||
                  Object.keys(filterOptions.ranges || {}).length > 0) && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-end gap-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Filter size={16} /> Filters
                      {isFiltering && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                    </div>

                    {Object.entries(filterOptions.categorical || {}).map(([col, vals]: any) => (
                      <div key={col} className="flex flex-col">
                        <label className="text-xs text-slate-400 mb-1 capitalize">
                          {col.replace(/_/g, " ")}
                        </label>
                        <select
                          value={filters[col] || ""}
                          onChange={(e) => setCategoricalFilter(col, e.target.value)}
                          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                        >
                          <option value="">All</option>
                          {(vals as string[]).map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {Object.entries(filterOptions.ranges || {}).map(([col, r]: any) => {
                      const cur = ranges[col] || [r.min, r.max];
                      return (
                        <div key={col} className="flex flex-col">
                          <label className="text-xs text-slate-400 mb-1 capitalize">
                            {col.replace(/_/g, " ")} ({cur[0]}–{cur[1]})
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={r.min} max={r.max} value={cur[0]}
                              onChange={(e) => setRanges({ ...ranges, [col]: [Number(e.target.value), cur[1]] })}
                              onBlur={() => applyFilters(filters, ranges)}
                              className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50"
                            />
                            <span className="text-slate-400">–</span>
                            <input
                              type="number" min={r.min} max={r.max} value={cur[1]}
                              onChange={(e) => setRanges({ ...ranges, [col]: [cur[0], Number(e.target.value)] })}
                              onBlur={() => applyFilters(filters, ranges)}
                              className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {(Object.keys(filters).length > 0 || Object.keys(ranges).length > 0) && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-slate-500 hover:text-red-500 flex items-center gap-1 ml-auto"
                      >
                        <X size={14} /> Clear filters
                      </button>
                    )}
                  </div>
                )}

              {/* Dynamic KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                  <KPICard key={idx} {...kpi} />
                ))}
              </div>

              {/* AI Executive Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">AI Executive Summary</h2>
                    <p className="text-sm text-slate-500">Key findings, risks, and recommended actions</p>
                  </div>
                  {summaryReady && (
                    <button
                      onClick={refreshSummary}
                      disabled={refreshingSummary}
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 shrink-0"
                      title="Regenerate the summary for the current filters"
                    >
                      {refreshingSummary ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                      {refreshingSummary ? "Refreshing…" : "Refresh summary"}
                    </button>
                  )}
                </div>

                {summaryStale && (
                  <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Filters changed — this summary reflects the previous selection. Click <strong>Refresh summary</strong> to update it.
                  </div>
                )}
                {summaryReady ? (
                  <Markdown>{dashboardInsights as string}</Markdown>
                ) : (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <p className="text-sm text-slate-400 pt-2 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> Generating your executive summary…
                    </p>
                  </div>
                )}
              </div>

              {/* Key Visualizations */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-800">Key Visualizations</h2>
                  <p className="text-sm text-slate-500 mt-1">The most decision-relevant charts</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  {primaryCharts.map((chart, idx) => renderChart(chart, idx))}
                </div>

                {advancedCharts.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="mt-6 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                      />
                      {showAdvanced ? "Hide" : "Show"} advanced analytics ({advancedCharts.length})
                    </button>

                    {showAdvanced && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-6 animate-in fade-in duration-300">
                        {advancedCharts.map((chart, idx) => renderChart(chart, idx + primaryCharts.length))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </main>


        {/* CHAT BUTTON (only once visuals exist) */}

        {chartData.length > 0 && (

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-full shadow-lg z-50"
          >
            {isChatOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span className="font-medium text-sm">{isChatOpen ? "Close" : "Ask AI Analyst"}</span>
          </button>

        )}

      </div>{/* END MAIN CONTENT AREA */}

      {/* INVISIBLE OVERLAY TO CLOSE CHAT ON CLICK OUTSIDE */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsChatOpen(false)} />
      )}

      {/* AGENT SIDE PANEL ("Ask Questions") */}
      {chartData.length > 0 && (
        <div
          className={`fixed bottom-24 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right ${
            isChatOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
          }`}
        >

          <div className="flex flex-col h-full">

            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-md">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 leading-tight">AI Data Analyst</h2>
                  <p className="text-xs text-slate-500">Ask anything about your data</p>
                </div>
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

            {chatMessages.length <= 1 && (
              <div className="px-4 pt-2 flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-blue-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

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
          height: 600, // enlarged view
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