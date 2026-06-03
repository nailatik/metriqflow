export type AiLocale = "ru" | "en";
export type DataLevel = "low" | "medium" | "high";
export type Confidence = "high" | "medium" | "low";

export type InsightsInput = {
  network: "telegram" | "vk";
  locale: AiLocale;
  title: string;
  period: string;
  followers: number | null;
  summary: { post_count: number; avg_views: number; engagement_rate: number };
  data_quality: { level: DataLevel; post_count: number };
  growth: Record<string, number | null>;
  best_time: { day_of_week: number; hour: number; avg_views: number } | null;
  top_posts: { excerpt: string; views: number; engagement: number }[];
};

export type Recommendation = {
  title: string;
  text: string;
  priority: number;          // 1 = do first
  confidence: Confidence;
};

export type InsightsPayload = {
  headline: string;
  recommendations: Recommendation[];
  data_quality: { level: DataLevel; post_count: number };
  generated_at: string;
  period: string;
};
