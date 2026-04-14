import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MessageSquare, TrendingUp, AlertCircle, Loader2, Send, Filter, BarChart2 } from 'lucide-react';

// --- Consistent Chart Styling (Palette) ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

// --- MOCK DATA (Replace with actual backend data) ---
const mockTrendData = [
  { name: 'Jan', revenue: 4000, profit: 2400 },
  { name: 'Feb', revenue: 3000, profit: 1398 },
  { name: 'Mar', revenue: 2000, profit: 9800 },
  { name: 'Apr', revenue: 2780, profit: 3908 },
  { name: 'May', revenue: 1890, profit: 4800 },
  { name: 'Jun', revenue: 2390, profit: 3800 },
];

const mockCategoryData = [
  { name: 'Electronics', value: 400 },
  { name: 'Clothing', value: 300 },
  { name: 'Home', value: 300 },
  { name: 'Books', value: 200 },
];

// --- SKELETON LOADER (Progressive Loading) ---
const DashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
    {/* KPI Skeletons */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
    </div>
    {/* Chart Skeletons */}
    <div className="grid grid-cols-12 gap-6 mt-6">
      <div className="col-span-12 lg:col-span-8 h-80 bg-gray-200 rounded-xl"></div>
      <div className="col-span-12 lg:col-span-4 h-80 bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

// --- REUSABLE COMPONENTS ---

// KPI Card (Layer 1)
const KPICard = ({ title, value, trend, icon: Icon }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
      {trend && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
    <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
      <Icon size={24} />
    </div>
  </div>
);

// Chart Card with AI Insight (Layer 2 & 3)
const ChartCard = ({ title, insight, children, colSpan = "col-span-12" }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col ${colSpan}`}>
    <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
    <div className="flex-grow min-h-[300px] w-full">
      {children}
    </div>
    {/* AI Insight Box below chart */}
    {insight && (
      <div className="mt-4 p-3 bg-indigo-50 text-indigo-900 text-sm rounded-lg flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-indigo-500" />
        <p>{insight}</p>
      </div>
    )}
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
export default function DataDashboard({ data, isLoading = false }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'agent', content: 'Hi! Ask me anything about your data dashboard.' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Fallbacks for data to render either backend real data or mock data
  const trendData = data?.trendData || mockTrendData;
  const categoryData = data?.categoryData || mockCategoryData;
  const kpis = data?.kpis || [
    { title: "Total Revenue", value: "₹12.4M", trend: 8.2, icon: BarChart2 },
    { title: "Active Customers", value: "48,293", trend: -2.4, icon: MessageSquare },
    { title: "Top Category", value: "Electronics", trend: 12.5, icon: TrendingUp },
    { title: "Data Anomalies", value: "3 Detected", trend: 0, icon: AlertCircle },
  ];
  const aiSummary = data?.aiSummary || "Revenue has seen a steady increase over the last quarter, primarily driven by the Electronics sector. However, customer retention in the North region has dipped by 4%, indicating a potential area for targeted marketing.";
  const revenueInsight = data?.insights?.revenue || "Profit margins peaked in March, correlating with the launch of the Spring Electronics catalog.";
  const categoryInsight = data?.insights?.category || "Electronics make up 33% of total revenue, double that of Books.";
  const regionalInsight = data?.insights?.regional || "Region South contributes 45% of revenue, consistently outperforming the North region across all quarters.";

  if (isLoading) return <DashboardSkeleton />;

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const question = chatInput;
    // Add user question
    setChatHistory([...chatHistory, { role: 'user', content: question }]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // Update the URL to match your backend's chat endpoint (e.g., FastAPI running on port 8000)
      const response = await fetch('http://localhost:8000/api/chat', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: question, context: data }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      
      setChatHistory(prev => [...prev, { 
        role: 'agent', 
        content: result.reply || result.message || result.response || 'Sorry, I could not process that request.' 
      }]);
    } catch (error) {
       console.error("Chat error:", error);
       setChatHistory(prev => [...prev, { 
        role: 'agent', 
        content: 'There was an error connecting to the agent. Please ensure the backend is running.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* MAIN DASHBOARD CONTENT */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        
        {/* GLOBAL FILTERS & HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Executive Data Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">AI-generated insights from your uploaded dataset.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <Filter size={16} className="text-gray-400 ml-2" />
            <select className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium cursor-pointer">
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>Year to Date</option>
            </select>
            <select className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium cursor-pointer border-l pl-3 ml-1">
              <option>All Regions</option>
              <option>North America</option>
              <option>Europe</option>
            </select>
          </div>
        </div>

        {/* LAYER 1: EXECUTIVE SUMMARY (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, idx) => {
            // Use dynamic icon logic based on title, fallback to BarChart2
            let IconComp = BarChart2;
            if (kpi.title.toLowerCase().includes('customer')) IconComp = MessageSquare;
            if (kpi.title.toLowerCase().includes('category')) IconComp = TrendingUp;
            if (kpi.title.toLowerCase().includes('anomalies')) IconComp = AlertCircle;
            if (kpi.icon && typeof kpi.icon !== 'string') IconComp = kpi.icon;

            return <KPICard key={idx} title={kpi.title} value={kpi.value} trend={kpi.trend} icon={IconComp} />
          })}
        </div>

        {/* OVERALL AI SUMMARY */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-8 text-white shadow-md">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <span className="bg-white/20 p-1.5 rounded-md">✨</span> Key Strategic Insight
          </h3>
          <p className="text-blue-50 leading-relaxed">
            {aiSummary}
          </p>
        </div>

        {/* TABS (To prevent clutter - Point 9) */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {['Overview', 'Trends', 'Categories', 'Deep Dive'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* LAYER 2: CORE VISUALS (12-Column Grid) */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-12 gap-6">
            
            {/* Main Trend Chart - 8 Columns */}
            <ChartCard 
              title="Revenue vs Profit Trend" 
              colSpan="col-span-12 lg:col-span-8"
              insight={revenueInsight}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Category Distribution - 4 Columns */}
            <ChartCard 
              title="Revenue by Category" 
              colSpan="col-span-12 lg:col-span-4"
              insight={categoryInsight}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Comparison Bar Chart - 12 Columns */}
            <ChartCard 
              title="Regional Performance Comparison" 
              colSpan="col-span-12"
              insight={regionalInsight}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="revenue" fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="profit" fill={COLORS[2]} radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        )}
        
        {/* Placeholder for other tabs */}
        {activeTab !== 'Overview' && (
          <div className="h-96 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
            Select the Overview tab to see the main layout, or expand this section to add specific deep-dives.
          </div>
        )}
      </div>

      {/* --- AGENT SIDE PANEL ("Ask Questions") --- */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <MessageSquare size={18} className="text-white" />
          </div>
          <h2 className="font-semibold text-gray-800">Ask Data Agent</h2>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl p-3 text-sm bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleAskQuestion} className="relative">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about your data..." 
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-[10px] text-gray-400 text-center mt-3">
            Try: "Show sales trend in 2023"
          </p>
        </div>
      </div>

    </div>
  );
}