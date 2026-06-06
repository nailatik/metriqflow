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

export interface PostsSearchResult {
  posts: TelegramPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PostsSearchParams {
  channelId: number;
  q?: string;
  from?: string;
  to?: string;
  sort?: "views" | "date";
  page?: number;
  limit?: number;
}
