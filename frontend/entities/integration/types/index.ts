export interface TgAccount {
  telegram_username: string | null;
  first_name: string;
  linked_at: string;
}

// Shape returned by GET /integrations/telegram/channels. `channel_id` is a
// Telegram bigint surfaced as a string by node-postgres. Stats fields come
// from a JOIN+aggregate on telegram_posts.
export interface TgChannel {
  id: number;
  channel_id: string;
  title: string;
  username: string | null;
  member_count: number | null;
  added_at: string;
  post_count: number;
  total_views: number;
}

export interface TgStatus {
  linked: boolean;
  account: TgAccount | null;
}

export interface TgTokenData {
  token: string;
  expiresAt: string;
}
