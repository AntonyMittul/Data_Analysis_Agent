import { useEffect, useState } from "react";
import { ShieldCheck, Target, Compass, CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE } from "../lib/config";

/**
 * AI Evaluation card (Data Dashboard only).
 *
 * Self-contained, additive component: it calls the backend /evaluate endpoint
 * and shows automated accuracy / relevance / consistency scores for the
 * generated charts and insights. Re-evaluates whenever `signature` changes.
 */

interface MetricDetail {
  score: number;
  checks: string[];
}
interface EvalResult {
  status: string;
  accuracy: number;
  relevance: number;
  consistency: number;
  overall: number;
  insights_evaluated?: boolean;
  details?: Record<string, MetricDetail>;
}

const tone = (s: number) =>
  s >= 80
    ? { text: "text-emerald-600", bar: "bg-emerald-500", soft: "bg-emerald-50" }
    : s >= 60
    ? { text: "text-amber-600", bar: "bg-amber-500", soft: "bg-amber-50" }
    : { text: "text-rose-600", bar: "bg-rose-500", soft: "bg-rose-50" };

const METRICS = [
  { key: "accuracy", label: "Accuracy", Icon: Target },
  { key: "relevance", label: "Relevance", Icon: Compass },
  { key: "consistency", label: "Consistency", Icon: CheckCircle2 },
] as const;

export default function EvalSummary({
  filePath,
  signature,
}: {
  filePath: string;
  signature: string;
}) {
  const [data, setData] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/evaluate?file_path=${encodeURIComponent(filePath)}`);
        const json = await res.json();
        if (!cancelled) setData(json?.status === "success" ? json : null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath, signature]);

  if (!filePath) return null;

  const overall = data?.overall ?? 0;
  const health =
    overall >= 80
      ? { label: "All systems healthy", ...tone(overall) }
      : overall >= 60
      ? { label: "Good", ...tone(overall) }
      : { label: "Needs attention", ...tone(overall) };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">AI Evaluation</h3>
            <p className="text-xs text-slate-500">
              Automated quality scores for the generated analysis
            </p>
          </div>
        </div>
        {data && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${health.soft} ${health.text}`}>
            {loading ? "Re-evaluating…" : health.label}
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {METRICS.map((m) => (
            <div key={m.key} className="space-y-2">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-7 bg-slate-100 rounded w-1/2" />
              <div className="h-1.5 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-400">Evaluation will appear once analysis is ready.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {METRICS.map(({ key, label, Icon }) => {
            const score = (data as any)[key] as number;
            const t = tone(score);
            const checks = data.details?.[key]?.checks || [];
            return (
              <div key={key} title={checks.join("\n")}>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <Icon size={14} /> {label}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-3xl font-bold ${t.text}`}>{score}</span>
                  <span className="text-slate-400 text-sm">/100</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${t.bar} transition-all duration-500`} style={{ width: `${score}%` }} />
                </div>
                {checks[0] && <p className="text-[11px] text-slate-400 mt-1.5 truncate">{checks[0]}</p>}
              </div>
            );
          })}
        </div>
      )}

      {data && !data.insights_evaluated && (
        <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> Insight checks pending — refresh the summary to include them.
        </p>
      )}
    </div>
  );
}
