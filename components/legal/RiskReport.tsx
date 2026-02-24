import { cn } from "@/lib/utils";
import type { RiskReport as RiskReportType, RiskFlag } from "@/types/legal";

interface RiskReportProps {
  report: RiskReportType;
  className?: string;
}

const severityConfig: Record<
  RiskFlag["severity"],
  { label: string; classes: string }
> = {
  HIGH: {
    label: "HIGH",
    classes: "bg-red-50 border-red-200 text-red-900",
  },
  MEDIUM: {
    label: "MEDIUM",
    classes: "bg-yellow-50 border-yellow-200 text-yellow-900",
  },
  LOW: {
    label: "LOW",
    classes: "bg-blue-50 border-blue-200 text-blue-900",
  },
};

function scoreColor(score: number) {
  if (score >= 70) return "text-red-600";
  if (score >= 40) return "text-yellow-600";
  return "text-green-600";
}

function scoreLabel(score: number) {
  if (score >= 70) return "High Risk";
  if (score >= 40) return "Medium Risk";
  return "Low Risk";
}

export function RiskReport({ report, className }: RiskReportProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Header: risk score */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Risk Analysis
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {report.red_flags.length} flag
            {report.red_flags.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="text-right">
          <div className={cn("text-4xl font-bold", scoreColor(report.risk_score))}>
            {report.risk_score}
          </div>
          <div className="text-xs text-gray-400">
            /100 · {scoreLabel(report.risk_score)}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-sm text-gray-600 leading-relaxed">{report.summary}</p>
      </div>

      {/* Red Flags */}
      {report.red_flags.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Red Flags
          </h3>
          <div className="space-y-3">
            {report.red_flags.map((flag, i) => {
              const config = severityConfig[flag.severity];
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    config.classes
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-bold px-1.5 py-0.5 rounded",
                        flag.severity === "HIGH" &&
                          "bg-red-200 text-red-800",
                        flag.severity === "MEDIUM" &&
                          "bg-yellow-200 text-yellow-800",
                        flag.severity === "LOW" &&
                          "bg-blue-200 text-blue-800"
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="italic text-xs opacity-80">
                      &ldquo;{flag.clause}&rdquo;
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {flag.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Recommendations
          </h3>
          <ol className="space-y-1.5">
            {report.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm text-gray-600 leading-relaxed"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
