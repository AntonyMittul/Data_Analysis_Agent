import { Link } from 'react-router';
import { ArrowRight, ShieldCheck, Lock, FileSpreadsheet, FileText } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeProvider';

export function Home() {
  return (
    <div className="relative h-screen bg-[#fafafa] dark:bg-[#0f1117] font-sans text-slate-900 dark:text-white selection:bg-[#ff5a1f]/20 overflow-hidden flex flex-col">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm39 39V1H1v38h38z' fill='%23000000' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }}
      />
      <div 
        className="hidden dark:block absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm39 39V1H1v38h38z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 flex flex-col h-full max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-[4px] h-6">
              <div className="w-[6px] h-[14px] bg-[#ff5a1f] rounded-full" />
              <div className="w-[6px] h-[22px] bg-[#ff5a1f] rounded-full" />
              <div className="w-[6px] h-[10px] bg-[#ff5a1f] rounded-full" />
            </div>
            <span className="text-xl font-bold tracking-tight">DataSense AI</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 flex flex-col justify-evenly px-6 pb-6 w-full max-w-[1200px] mx-auto">
          
          {/* Hero Section */}
          <div className="max-w-[800px]">
            <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-bold leading-[1.1] mb-3 md:mb-5 tracking-[-0.02em]">
              Make Sense of Your <br className="hidden md:block"/>
              <span className="text-[#ff5a1f]">Data</span> and <span className="text-[#ff5a1f]">Documents</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
              Upload your files, let AI do the heavy lifting, <br className="hidden md:block" />
              and get insights you can act on.
            </p>
          </div>

          {/* Features Section */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 relative">
            
            {/* Vertical Divider */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 -translate-x-1/2" />

            {/* Feature 1: Data Analysis */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 lg:gap-8 items-center lg:pr-8">
              <div className="flex-1 w-full">
                <div className="w-12 h-12 rounded-2xl bg-[#fff0eb] dark:bg-[#ff5a1f]/10 flex items-center justify-center mb-4 text-[#ff5a1f]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-2 lg:mb-4 tracking-tight">Data Analysis</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base">
                  Upload CSV or Excel files and generate interactive charts, trends, and insights.
                </p>
                <Link to="/data-dashboard" className="text-[#ff5a1f] font-semibold flex items-center gap-2 hover:gap-3 transition-all text-sm lg:text-base">
                  Start analysis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {/* Data Mockup */}
              <div className="flex-1 w-full max-w-[320px] relative mt-8 md:mt-0">
                <div className="absolute -top-5 -left-4 md:-left-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-sm z-10 text-[10px] lg:text-xs font-medium">
                  <div className="bg-green-100 text-green-700 p-0.5 rounded"><FileSpreadsheet className="w-3 h-3" /></div>
                  sales_data.csv
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none pt-7">
                  <div className="text-[10px] lg:text-[11px] font-semibold text-slate-500 mb-3">Revenue Over Time</div>
                  
                  {/* Chart SVG */}
                  <div className="h-20 lg:h-24 w-full relative mb-4">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,30 L15,25 L30,28 L45,20 L60,22 L75,10 L90,20 L100,0 L100,40 L0,40 Z" fill="url(#chart-grad)" />
                      <polyline points="0,30 15,25 30,28 45,20 60,22 75,10 90,20 100,0" fill="none" stroke="#ff5a1f" strokeWidth="1.5" />
                      <circle cx="0" cy="30" r="2" fill="#ff5a1f" />
                      <circle cx="15" cy="25" r="2" fill="#ff5a1f" />
                      <circle cx="30" cy="28" r="2" fill="#ff5a1f" />
                      <circle cx="45" cy="20" r="2" fill="#ff5a1f" />
                      <circle cx="60" cy="22" r="2" fill="#ff5a1f" />
                      <circle cx="75" cy="10" r="2" fill="#ff5a1f" />
                      <circle cx="90" cy="20" r="2" fill="#ff5a1f" />
                      <circle cx="100" cy="0" r="2" fill="#ff5a1f" />
                    </svg>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex gap-2">
                    <div className="flex-1 border border-slate-100 dark:border-slate-800 rounded-md lg:rounded-lg p-1.5 lg:p-2">
                      <div className="text-[9px] lg:text-[10px] text-slate-400 mb-0.5">Revenue</div>
                      <div className="text-xs lg:text-sm font-bold tracking-tight">$245,600</div>
                      <div className="text-[8px] lg:text-[9px] font-medium text-green-500 mt-1">+16.4%</div>
                    </div>
                    <div className="flex-1 border border-slate-100 dark:border-slate-800 rounded-md lg:rounded-lg p-1.5 lg:p-2">
                      <div className="text-[9px] lg:text-[10px] text-slate-400 mb-0.5">Profit</div>
                      <div className="text-xs lg:text-sm font-bold tracking-tight">$86,420</div>
                      <div className="text-[8px] lg:text-[9px] font-medium text-green-500 mt-1">+11.2%</div>
                    </div>
                    <div className="flex-1 border border-slate-100 dark:border-slate-800 rounded-md lg:rounded-lg p-1.5 lg:p-2">
                      <div className="text-[9px] lg:text-[10px] text-slate-400 mb-0.5">Orders</div>
                      <div className="text-xs lg:text-sm font-bold tracking-tight">1,240</div>
                      <div className="text-[8px] lg:text-[9px] font-medium text-green-500 mt-1">+8.7%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Document Intelligence */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 lg:gap-8 items-center lg:pl-8">
              <div className="flex-1 w-full">
                <div className="w-12 h-12 rounded-2xl bg-[#fff0eb] dark:bg-[#ff5a1f]/10 flex items-center justify-center mb-4 text-[#ff5a1f]">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-2 lg:mb-4 tracking-tight">Document Intelligence</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base">
                  Upload PDFs and ask questions to get accurate, sourced answers.
                </p>
                <Link to="/document-extraction" className="text-[#ff5a1f] font-semibold flex items-center gap-2 hover:gap-3 transition-all text-sm lg:text-base">
                  Analyze documents <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {/* Doc Mockup */}
              <div className="flex-1 w-full max-w-[340px] relative mt-8 md:mt-0">
                <div className="absolute -top-5 -right-2 md:right-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-sm z-10 text-[10px] lg:text-xs font-medium">
                  <div className="bg-red-100 text-red-600 p-0.5 rounded"><FileText className="w-3 h-3" /></div>
                  research_report.pdf
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 lg:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none flex gap-3 lg:gap-4 mt-3 lg:mt-4">
                  {/* Left doc lines */}
                  <div className="w-[64px] lg:w-[72px] shrink-0 border border-slate-100 dark:border-slate-800 rounded-md lg:rounded-lg p-2 lg:p-3 flex flex-col gap-2">
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
                    
                    <div className="h-1 lg:h-1.5 bg-[#ff5a1f]/40 rounded w-full" />
                    <div className="h-1 lg:h-1.5 bg-[#ff5a1f]/40 rounded w-4/5" />
                    <div className="h-1 lg:h-1.5 bg-[#ff5a1f]/40 rounded w-2/3 mb-1" />
                    
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                    <div className="h-1 lg:h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  </div>
                  
                  {/* Chat bubbles */}
                  <div className="flex-1 flex flex-col gap-2.5 py-1">
                    <div className="bg-[#fff5f2] dark:bg-[#ff5a1f]/10 rounded-xl rounded-tr-sm p-2 lg:p-3 text-[10px] lg:text-[11px] font-medium text-slate-800 dark:text-slate-200 ml-4 self-end">
                      What are the key findings?
                    </div>
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl rounded-tl-sm p-2 lg:p-3 text-[10px] lg:text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed shadow-sm">
                      The report highlights three key findings about market growth, customer behavior, and retention strategies.
                      <div className="mt-2 text-[8px] lg:text-[9px] text-slate-500 font-medium">
                        Sources: <span className="text-[#ff5a1f] underline decoration-[#ff5a1f]/40 cursor-pointer">Page 4</span>, <span className="text-[#ff5a1f] underline decoration-[#ff5a1f]/40 cursor-pointer">Page 7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Banner */}
          <div className="bg-[#fffcfb] dark:bg-[#ff5a1f]/5 rounded-2xl lg:rounded-3xl p-4 lg:px-8 lg:py-6 flex items-center gap-4 lg:gap-6 border border-[#ffede6] dark:border-[#ff5a1f]/20 shadow-sm shrink-0">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-[#fff0eb] dark:bg-[#ff5a1f]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-[#ff5a1f] w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-base lg:text-lg mb-0.5 lg:mb-1 tracking-tight">Your data stays private and secure</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Files are processed temporarily and are not stored after your analysis.</p>
            </div>
            <div className="shrink-0 text-slate-400 hidden sm:block">
              <Lock className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2} />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
