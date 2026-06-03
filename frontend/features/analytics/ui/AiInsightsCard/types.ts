export type InsightsPayload = {
  recommendations: { title: string; text: string }[];
  generated_at:    string;
  period:          string;
};
