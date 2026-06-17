import { Link } from 'react-router';
import { BarChart3, FileText } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeProvider';
import HomeBackground from '../components/HomeBackground';

export function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <HomeBackground />
      <ThemeToggle className="absolute top-6 right-6 z-10" />
      <div className="relative z-10 max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl mb-4 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
DataSense AI
          </h1>
          <p className="text-slate-600 text-lg">
            AI-powered data analytics and document intelligence
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            to="/data-dashboard"
            className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-400"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl mb-2 text-slate-800">Data Dashboard</h2>
              <p className="text-slate-600">
                Turn raw spreadsheets into interactive charts, trends, and AI-generated business insights — in seconds.
              </p>
            </div>
          </Link>

          <Link
            to="/document-extraction"
            className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-violet-400"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-violet-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl mb-2 text-slate-800">Document Intelligence</h2>
              <p className="text-slate-600">
                Chat with your documents and get instant, sourced answers from reports, policies, and contracts.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
