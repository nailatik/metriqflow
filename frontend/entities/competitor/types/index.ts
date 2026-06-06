export interface Competitor {
  id:               number;
  platform:         "tg" | "vk";
  identifier:       string;
  title:            string | null;
  photo_url:        string | null;
  subscriber_count: number | null;
  added_at:         string;
}

export type ErBasis = "full" | "reactions_only" | "na";

export interface CompareMetrics {
  subscribers:   number | null;
  avg_views:     number | null;
  er:            number | null;
  er_basis:      ErBasis;
  post_freq:     number | null;
  posts_sampled: number;
}

export interface CompareResponse {
  competitor:  Omit<Competitor, "added_at">;
  period_days: number;
  own:         CompareMetrics | null;
  rival:       CompareMetrics;
  fetched_at:  string;
}
