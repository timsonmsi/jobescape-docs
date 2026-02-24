export interface RiskFlag {
  clause: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
}

export interface RiskReport {
  risk_score: number;
  summary: string;
  red_flags: RiskFlag[];
  recommendations: string[];
}

export interface LegalReviewRow {
  review_id: string;
  filename: string;
  policy: string;
  risk_score: string;
  red_flags: string;
  recommendations: string;
  summary: string;
  report_url: string;
  created_at: string;
}

export interface NdaReviewRow {
  review_id: string;
  filename: string;
  risk_score: string;
  red_flags: string;
  recommendations: string;
  summary: string;
  report_url: string;
  created_at: string;
}
