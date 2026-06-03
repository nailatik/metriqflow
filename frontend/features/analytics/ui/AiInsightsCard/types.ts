export type DataLevel = "low" | "medium" | "high";
export type Confidence = "high" | "medium" | "low";

export type Recommendation = {
  title: string;
  text: string;
  priority: number;
  confidence: Confidence;
};

export type InsightsPayload = {
  headline: string;
  recommendations: Recommendation[];
  data_quality: { level: DataLevel; post_count: number };
  generated_at: string;
  period: string;
};
