import { Link } from 'react-router';
import { ArrowRight, Database, Search } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeProvider';
import HomeBackground from '../components/HomeBackground';

export function Home() {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center overflow-hidden font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      <HomeBackground />
      <ThemeToggle className="absolute top-6 right-6 z-20" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 md:py-24 lg:flex lg:items-center lg:gap-16 max-w-7xl">
        
        {/* Left Column: Hero Text */}
        <div className="lg:w-1/2 mb-16 lg:mb-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-sm font-semibold mb-8 ring-1 ring-blue-200/50 dark:ring-blue-800/50 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-blue-500"></span>
            </span>
            Data & Document Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
            Elevate your <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Business Insights
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Welcome to <strong className="text-slate-900 dark:text-slate-200 font-semibold">DataSense</strong>. Seamlessly transform raw spreadsheets into interactive visual dashboards, and extract instant, sourced answers from your most complex reports and contracts.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/data-dashboard" className="group inline-flex justify-center items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5">
              Explore Data
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/document-extraction" className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-900/20">
              Analyze Documents
            </Link>
          </div>
        </div>

        {/* Right Column: Cards */}
        <div className="lg:w-1/2 flex flex-col gap-6">
          <Link
            to="/data-dashboard"
            className="group relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 transition-all duration-500 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/20"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-4 group-hover:translate-x-0">
               <ArrowRight className="w-6 h-6 text-blue-500" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Database className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Data Dashboard</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                  Turn raw spreadsheets into interactive charts and trends. Gain automated business insights in seconds.
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/document-extraction"
            className="group relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 transition-all duration-500 border border-slate-200/80 dark:border-slate-800/80 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/10 dark:hover:shadow-violet-900/20"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-4 group-hover:translate-x-0">
               <ArrowRight className="w-6 h-6 text-violet-500" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Search className="w-10 h-10 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Document Intelligence</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                  Chat with your documents and get instant, sourced answers from reports, policies, and contracts.
                </p>
              </div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
