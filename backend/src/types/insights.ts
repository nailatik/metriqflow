export type InsightsInput = {
  network: "telegram" | "vk";
  title: string;
  period: string;
  followers: number | null;
  summary: { post_count: number; avg_views: number; engagement_rate: number };
  growth: Record<string, number | null>;
  best_time: { day_of_week: number; hour: number; avg_views: number } | null;
  top_posts: { excerpt: string; views: number; engagement: number }[];
};

export type InsightsPayload = {
  recommendations: { title: string; text: string }[];
  generated_at: string;
  period: string;
};
