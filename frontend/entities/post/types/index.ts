export interface TelegramPost {
  id: number;
  message_id: number;
  text: string | null;
  views: number | null;
  reactions_total: number | null;
  forwards: number | null;
  comments: number | null;
  has_media: boolean;
  posted_at: string;
}

export interface VkPost {
  id: number;
  text: string | null;
  views: number;
  likes: number;
  reposts: number;
  comments: number;
  has_media: boolean;
  posted_at: string;
}

export interface TgSearchResult {
  posts: TelegramPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface VkSearchResult {
  posts: VkPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  community_id: string;
}

export interface TgSearchParams {
  channelId: number;
  q?: string;
  from?: string;
  to?: string;
  sort?: "views" | "date";
  page?: number;
  limit?: number;
}

export interface VkSearchParams {
  communityId: number;
  q?: string;
  from?: string;
  to?: string;
  sort?: "views" | "date";
  page?: number;
  limit?: number;
}
